// engage.mjs — Multi-Brand-Community-Autopilot: beantwortet Kommentare (FB + IG)
// und FB-Seiten-Nachrichten fuer ALLE Marken — jede in ihrer eigenen Stimme.
// Compliance-Leitplanken aus config/persona.md gelten markenuebergreifend.
// Heikle Faelle -> data/escalations.ndjson (beantwortet der Mensch).
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { ask } from './lib/claude.mjs';
import { loadBrands, credsFor, brandDir } from './lib/brands.mjs';

const V = process.env.META_GRAPH_VERSION || 'v21.0';
const baseRules = await readFile(new URL('../config/persona.md', import.meta.url), 'utf8');
const brands = await loadBrands();

async function escalate(kind, item) {
  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await appendFile(new URL('../data/escalations.ndjson', import.meta.url),
    JSON.stringify({ kind, ts: Date.now(), ...item }) + '\n');
}

let replied = 0, escalated = 0;

for (const brand of brands) {
  const creds = credsFor(brand.id);
  if (!creds) continue;
  const TOKEN = creds.pageToken, PAGE = creds.pageId, IG = creds.igUserId;

  const graph = async (path, params = {}) => {
    const q = new URLSearchParams({ ...params, access_token: TOKEN });
    const res = await fetch(`https://graph.facebook.com/${V}/${path}?${q}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data).slice(0, 150));
    return data;
  };
  const post = async (path, body) => {
    const res = await fetch(`https://graph.facebook.com/${V}/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: TOKEN })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data).slice(0, 150));
    return data;
  };

  const dir = await brandDir(brand.id);
  const stateUrl = new URL('engage-state.json', dir);
  let state = { repliedComments: [], repliedMessages: [] };
  try { state = JSON.parse(await readFile(stateUrl, 'utf8')); } catch {}

  const draft = async (kind, userText, context) => {
    const out = await ask(
      `${baseRules}

ABWEICHENDE MARKEN-IDENTITAET (du antwortest NICHT als Florian, sondern als diese Marke):
Marke: ${brand.name} (${brand.handle}) — ${brand.niche}
Stimme: ${brand.voice}
Beispielsatz: "${brand.voiceSample}"
CTA der Marke: "${brand.cta}"

Aufgabe: Beantworte diese ${kind === 'comment' ? 'Kommentar' : 'Privatnachricht'} in der Markenstimme.
Kontext (eigener Post): ${context || '—'}
Nachricht: "${userText}"

Pruefe ZUERST die Eskalationsregeln. Antworte NUR als JSON:
{"action":"reply"|"escalate"|"skip","reason":"kurz","reply":"Text oder leer"}`,
      { maxTokens: 500, temperature: 0.7 }
    );
    return JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  };

  // FB-Kommentare
  try {
    const feed = await graph(`${PAGE}/posts`, { fields: 'id,message', limit: 15 });
    for (const fp of feed.data || []) {
      const comments = await graph(`${fp.id}/comments`, { fields: 'id,message,from', limit: 50 });
      for (const c of comments.data || []) {
        if (state.repliedComments.includes(c.id) || c.from?.id === PAGE || !c.message?.trim()) { state.repliedComments.push(c.id); continue; }
        const d = await draft('comment', c.message, fp.message?.slice(0, 200));
        if (d.action === 'reply' && d.reply) { await post(`${c.id}/comments`, { message: d.reply }); replied++; }
        else if (d.action === 'escalate') { await escalate('fb-comment', { brand: brand.id, id: c.id, text: c.message, reason: d.reason }); escalated++; }
        state.repliedComments.push(c.id);
      }
    }
  } catch (e) { console.warn(`[${brand.id}] FB-Kommentare: ${e.message.slice(0, 100)}`); }

  // IG-Kommentare
  if (IG) {
    try {
      const media = await graph(`${IG}/media`, { fields: 'id,caption', limit: 15 });
      for (const m of media.data || []) {
        const comments = await graph(`${m.id}/comments`, { fields: 'id,text,username', limit: 50 });
        for (const c of comments.data || []) {
          if (state.repliedComments.includes(c.id) || !c.text?.trim()) { state.repliedComments.push(c.id); continue; }
          const d = await draft('comment', c.text, m.caption?.slice(0, 200));
          if (d.action === 'reply' && d.reply) { await post(`${c.id}/replies`, { message: d.reply }); replied++; }
          else if (d.action === 'escalate') { await escalate('ig-comment', { brand: brand.id, id: c.id, text: c.text, reason: d.reason }); escalated++; }
          state.repliedComments.push(c.id);
        }
      }
    } catch (e) { console.warn(`[${brand.id}] IG-Kommentare: ${e.message.slice(0, 100)}`); }
  }

  // FB-Nachrichten
  try {
    const convos = await graph(`${PAGE}/conversations`, { fields: 'id,unread_count', limit: 15 });
    for (const conv of convos.data || []) {
      if (!conv.unread_count) continue;
      const msgs = await graph(`${conv.id}/messages`, { fields: 'id,message,from', limit: 5 });
      const last = (msgs.data || []).find(m => m.from?.id !== PAGE);
      if (!last?.message || state.repliedMessages.includes(last.id)) continue;
      const d = await draft('message', last.message, null);
      if (d.action === 'reply' && d.reply) { await post(`${conv.id}/messages`, { message: d.reply }); replied++; }
      else if (d.action === 'escalate') { await escalate('fb-message', { brand: brand.id, id: last.id, text: last.message, reason: d.reason }); escalated++; }
      state.repliedMessages.push(last.id);
    }
  } catch (e) { console.warn(`[${brand.id}] FB-Nachrichten: ${e.message.slice(0, 100)}`); }

  state.repliedComments = state.repliedComments.slice(-2000);
  state.repliedMessages = state.repliedMessages.slice(-500);
  await writeFile(stateUrl, JSON.stringify(state, null, 2));
}

console.log(`✅ Engage: ${replied} beantwortet, ${escalated} eskaliert (ueber ${brands.length} Marken).`);
