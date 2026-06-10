// engage.mjs — Community-Autopilot: beantwortet Kommentare (FB + IG) und
// FB-Seiten-Nachrichten automatisch in Florians Stimme (config/persona.md).
//
// Sicherheit:
//  - Heikle Faelle (Beschwerde, Recht, Notlage, aggressiv) werden NICHT beantwortet,
//    sondern nach data/escalations.ndjson eskaliert (beantwortet der Mensch).
//  - Beantwortete IDs werden in content/engage-state.json gemerkt (idempotent).
//
// Benoetigt: META_PAGE_ID, META_PAGE_TOKEN, META_IG_USER_ID, ANTHROPIC_API_KEY.
// FB-Nachrichten zusaetzlich: pages_messaging-Berechtigung des Tokens.
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { ask } from './lib/claude.mjs';

const V = process.env.META_GRAPH_VERSION || 'v21.0';
const PAGE = process.env.META_PAGE_ID, TOKEN = process.env.META_PAGE_TOKEN, IG = process.env.META_IG_USER_ID;
if (!PAGE || !TOKEN) { console.error('META_PAGE_ID / META_PAGE_TOKEN fehlen.'); process.exit(1); }

const stateUrl = new URL('../content/engage-state.json', import.meta.url);
let state = { repliedComments: [], repliedMessages: [] };
try { state = JSON.parse(await readFile(stateUrl, 'utf8')); } catch {}
const persona = await readFile(new URL('../config/persona.md', import.meta.url), 'utf8');

async function graph(path, params = {}) {
  const q = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`https://graph.facebook.com/${V}/${path}?${q}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data).slice(0, 200));
  return data;
}
async function graphPost(path, body) {
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data).slice(0, 200));
  return data;
}

async function escalate(kind, item) {
  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await appendFile(new URL('../data/escalations.ndjson', import.meta.url),
    JSON.stringify({ kind, ts: Date.now(), ...item }) + '\n');
  console.log(`  🚩 eskaliert (${kind}): ${String(item.text).slice(0, 60)}`);
}

// Eine Antwort generieren — oder null, wenn der Fall eskaliert werden muss.
async function draftReply(kind, userText, context) {
  const out = await ask(
    `${persona}

Aufgabe: Beantworte als Florian diese ${kind === 'comment' ? 'Kommentar' : 'Privatnachricht'}.

Kontext (eigener Post): ${context || '—'}
Nachricht des Nutzers: "${userText}"

Pruefe ZUERST die Eskalationsregeln (Regel 4). Antworte NUR als JSON:
{"action":"reply"|"escalate"|"skip","reason":"kurz","reply":"Antworttext oder leer"}
"skip" nur fuer reine Emojis/Spam ohne Frage.`,
    { maxTokens: 500, temperature: 0.7 }
  );
  const a = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  return a;
}

let replied = 0, escalated = 0;

// ---------- 1) Facebook-Kommentare auf den letzten 25 Page-Posts ----------
try {
  const feed = await graph(`${PAGE}/posts`, { fields: 'id,message', limit: 25 });
  for (const post of feed.data || []) {
    const comments = await graph(`${post.id}/comments`, { fields: 'id,message,from', limit: 50 });
    for (const c of comments.data || []) {
      if (state.repliedComments.includes(c.id)) continue;
      if (c.from?.id === PAGE) continue;             // eigene Antworten ueberspringen
      if (!c.message?.trim()) { state.repliedComments.push(c.id); continue; }
      const d = await draftReply('comment', c.message, post.message?.slice(0, 200));
      if (d.action === 'reply' && d.reply) {
        await graphPost(`${c.id}/comments`, { message: d.reply });
        replied++; console.log(`  💬 FB: "${c.message.slice(0, 40)}" -> "${d.reply.slice(0, 50)}"`);
      } else if (d.action === 'escalate') {
        await escalate('fb-comment', { id: c.id, text: c.message, reason: d.reason }); escalated++;
      }
      state.repliedComments.push(c.id);
    }
  }
} catch (e) { console.warn('FB-Kommentare: ' + e.message.slice(0, 120)); }

// ---------- 2) Instagram-Kommentare auf den letzten 25 Medien ----------
if (IG) {
  try {
    const media = await graph(`${IG}/media`, { fields: 'id,caption', limit: 25 });
    for (const m of media.data || []) {
      const comments = await graph(`${m.id}/comments`, { fields: 'id,text,username', limit: 50 });
      for (const c of comments.data || []) {
        if (state.repliedComments.includes(c.id)) continue;
        if (!c.text?.trim()) { state.repliedComments.push(c.id); continue; }
        const d = await draftReply('comment', c.text, m.caption?.slice(0, 200));
        if (d.action === 'reply' && d.reply) {
          await graphPost(`${c.id}/replies`, { message: d.reply });
          replied++; console.log(`  💬 IG: "${c.text.slice(0, 40)}" -> "${d.reply.slice(0, 50)}"`);
        } else if (d.action === 'escalate') {
          await escalate('ig-comment', { id: c.id, text: c.text, reason: d.reason }); escalated++;
        }
        state.repliedComments.push(c.id);
      }
    }
  } catch (e) { console.warn('IG-Kommentare: ' + e.message.slice(0, 120)); }
}

// ---------- 3) FB-Seiten-Nachrichten (Messenger) ----------
try {
  const convos = await graph(`${PAGE}/conversations`, { fields: 'id,unread_count', limit: 20 });
  for (const conv of convos.data || []) {
    if (!conv.unread_count) continue;
    const msgs = await graph(`${conv.id}/messages`, { fields: 'id,message,from', limit: 5 });
    const last = (msgs.data || []).find(m => m.from?.id !== PAGE);
    if (!last?.message || state.repliedMessages.includes(last.id)) continue;
    const d = await draftReply('message', last.message, null);
    if (d.action === 'reply' && d.reply) {
      await graphPost(`${conv.id}/messages`, { message: d.reply });
      replied++; console.log(`  ✉️ DM: "${last.message.slice(0, 40)}" -> "${d.reply.slice(0, 50)}"`);
    } else if (d.action === 'escalate') {
      await escalate('fb-message', { id: last.id, text: last.message, reason: d.reason }); escalated++;
    }
    state.repliedMessages.push(last.id);
  }
} catch (e) { console.warn('FB-Nachrichten (evtl. fehlt pages_messaging): ' + e.message.slice(0, 120)); }

// State begrenzen und speichern.
state.repliedComments = state.repliedComments.slice(-2000);
state.repliedMessages = state.repliedMessages.slice(-500);
await writeFile(stateUrl, JSON.stringify(state, null, 2));
console.log(`\n✅ Engage: ${replied} beantwortet, ${escalated} eskaliert (data/escalations.ndjson).`);
