// publish-meta.mjs — Autopilot-Publisher. Postet faellige Kalender-Eintraege organisch.
//
//   Facebook : Bild wird DIREKT hochgeladen (multipart, kein Hosting noetig).
//   Instagram: braucht eine oeffentliche Bild-URL -> PUBLIC_ASSET_BASE
//              (z.B. https://raw.githubusercontent.com/<user>/<repo>/<branch>/leadgen)
//
//   node publish-meta.mjs            -> alle ueberfaelligen Slots live posten
//   node publish-meta.mjs --review   -> nichts posten, content/to-post.md schreiben
import { readFile, writeFile } from 'node:fs/promises';

const REVIEW = process.argv.includes('--review');
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const PAGE = process.env.META_PAGE_ID, TOKEN = process.env.META_PAGE_TOKEN, IG = process.env.META_IG_USER_ID;
const ASSET_BASE = (process.env.PUBLIC_ASSET_BASE || '').replace(/\/$/, '');
const calUrl = new URL('../content/calendar.json', import.meta.url);
const rootUrl = new URL('../', import.meta.url);

const plan = JSON.parse(await readFile(calUrl, 'utf8'));
const now = Date.now();
const due = plan.filter(p => p.status === 'scheduled' && new Date(p.scheduledFor).getTime() <= now);

if (!due.length) {
  console.log('Nichts faellig. Naechster Slot:', plan.find(p => p.status === 'scheduled')?.scheduledFor || '—');
  process.exit(0);
}

const text = p => `${p.caption || p.hook}\n\n${(p.hashtags || []).join(' ')}`.trim();

async function graphJson(path, body) {
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
  return data;
}

async function graphUpload(path, fields, fileBuf, filename) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('access_token', TOKEN);
  fd.append('source', new Blob([fileBuf], { type: 'image/jpeg' }), filename);
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
  return data;
}

if (REVIEW) {
  const md = due.map((p, i) =>
    `## ${i + 1}. [${p.platform}] ${p.scheduledFor}\n**Bild:** ${p.assetPath || '—'}\n\n${text(p)}\n`).join('\n---\n\n');
  await writeFile(new URL('../content/to-post.md', import.meta.url), `# Jetzt zu posten (${due.length})\n\n${md}`);
  console.log(`📝 Review-Modus: ${due.length} Posts -> content/to-post.md`);
  process.exit(0);
}

if (!PAGE || !TOKEN) { console.error('META_PAGE_ID / META_PAGE_TOKEN fehlen.'); process.exit(1); }

let ok = 0;
for (const p of due) {
  try {
    if (p.platform === 'facebook') {
      if (p.assetPath) {
        const buf = await readFile(new URL(p.assetPath, rootUrl));
        await graphUpload(`${PAGE}/photos`, { caption: text(p) }, buf, p.id + '.jpg');
      } else {
        await graphJson(`${PAGE}/feed`, { message: text(p) });
      }
    } else if (p.platform === 'instagram') {
      if (!IG) throw new Error('META_IG_USER_ID fehlt');
      if (!p.assetPath || !ASSET_BASE) throw new Error('IG braucht assetPath + PUBLIC_ASSET_BASE');
      const imageUrl = `${ASSET_BASE}/${p.assetPath}`;
      const c = await graphJson(`${IG}/media`, { image_url: imageUrl, caption: text(p) });
      await graphJson(`${IG}/media_publish`, { creation_id: c.id });
    }
    p.status = 'posted'; p.postedAt = new Date().toISOString(); ok++;
    console.log(`✓ ${p.platform} — ${p.hook.slice(0, 50)}`);
  } catch (e) {
    p.status = 'error'; p.error = String(e.message).slice(0, 300);
    console.log(`✗ ${p.platform} — ${p.error.slice(0, 120)}`);
  }
}

await writeFile(calUrl, JSON.stringify(plan, null, 2));
console.log(`\n✅ ${ok}/${due.length} veroeffentlicht. Status in content/calendar.json aktualisiert.`);
