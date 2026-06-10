// publish-meta.mjs — Autopilot-Publisher fuer alle Formate.
//
//   image    FB: Direktupload (multipart)        IG: image_url (PUBLIC_ASSET_BASE)
//   carousel FB: Multi-Foto-Post (attached_media) IG: Carousel-Container (children)
//   reel     FB: Video-Direktupload               IG: media_type=REELS (video_url)
//
//   node publish-meta.mjs            -> faellige Slots live posten
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
const publicUrl = rel => `${ASSET_BASE}/${rel}`;

async function graphJson(path, body) {
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
  return data;
}

async function graphUpload(path, fields, fileBuf, filename, mime) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  fd.append('access_token', TOKEN);
  fd.append('source', new Blob([fileBuf], { type: mime }), filename);
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
  return data;
}

// IG-Container brauchen Verarbeitung — Status pollen bis FINISHED.
async function waitContainer(id, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`https://graph.facebook.com/${V}/${id}?fields=status_code&access_token=${TOKEN}`);
    const d = await res.json();
    if (d.status_code === 'FINISHED') return;
    if (d.status_code === 'ERROR') throw new Error('IG-Container-Verarbeitung fehlgeschlagen');
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('IG-Container Timeout');
}

async function publishFacebook(p) {
  if (p.format === 'carousel' && p.assetPaths?.length) {
    const ids = [];
    for (const rel of p.assetPaths) {
      const buf = await readFile(new URL(rel, rootUrl));
      const r = await graphUpload(`${PAGE}/photos`, { published: 'false' }, buf, rel.split('/').pop(), 'image/jpeg');
      ids.push(r.id);
    }
    await graphJson(`${PAGE}/feed`, { message: text(p), attached_media: ids.map(id => ({ media_fbid: id })) });
  } else if (p.format === 'reel' && p.assetPath) {
    const buf = await readFile(new URL(p.assetPath, rootUrl));
    await graphUpload(`${PAGE}/videos`, { description: text(p) }, buf, p.id + '.mp4', 'video/mp4');
  } else if (p.assetPath) {
    const buf = await readFile(new URL(p.assetPath, rootUrl));
    await graphUpload(`${PAGE}/photos`, { caption: text(p) }, buf, p.id + '.jpg', 'image/jpeg');
  } else {
    await graphJson(`${PAGE}/feed`, { message: text(p) });
  }
}

async function publishInstagram(p) {
  if (!IG) throw new Error('META_IG_USER_ID fehlt');
  if (!ASSET_BASE) throw new Error('IG braucht PUBLIC_ASSET_BASE');
  if (p.format === 'carousel' && p.assetPaths?.length) {
    const children = [];
    for (const rel of p.assetPaths) {
      const c = await graphJson(`${IG}/media`, { image_url: publicUrl(rel), is_carousel_item: true });
      children.push(c.id);
    }
    const parent = await graphJson(`${IG}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: text(p) });
    await graphJson(`${IG}/media_publish`, { creation_id: parent.id });
  } else if (p.format === 'reel' && p.assetPath) {
    const c = await graphJson(`${IG}/media`, { media_type: 'REELS', video_url: publicUrl(p.assetPath), caption: text(p) });
    await waitContainer(c.id);
    await graphJson(`${IG}/media_publish`, { creation_id: c.id });
  } else if (p.assetPath) {
    const c = await graphJson(`${IG}/media`, { image_url: publicUrl(p.assetPath), caption: text(p) });
    await graphJson(`${IG}/media_publish`, { creation_id: c.id });
  } else {
    throw new Error('IG-Post ohne Asset');
  }
}

if (REVIEW) {
  const md = due.map((p, i) =>
    `## ${i + 1}. [${p.platform} · ${p.format}] ${p.scheduledFor}\n**Assets:** ${p.assetPath || (p.assetPaths || []).join(', ') || '—'}\n\n${text(p)}\n`).join('\n---\n\n');
  await writeFile(new URL('../content/to-post.md', import.meta.url), `# Jetzt zu posten (${due.length})\n\n${md}`);
  console.log(`📝 Review-Modus: ${due.length} Posts -> content/to-post.md`);
  process.exit(0);
}

if (!PAGE || !TOKEN) { console.error('META_PAGE_ID / META_PAGE_TOKEN fehlen.'); process.exit(1); }

let ok = 0;
for (const p of due) {
  // Reel noch nicht gerendert? Eingeplant lassen — naechster Lauf nach dem Rendern postet es.
  if (p.format === 'reel' && !p.assetPath) {
    console.log(`… ${p.platform} reel ${p.id} wartet auf Video-Rendering`);
    continue;
  }
  try {
    if (p.platform === 'facebook') await publishFacebook(p);
    else if (p.platform === 'instagram') await publishInstagram(p);
    p.status = 'posted'; p.postedAt = new Date().toISOString(); ok++;
    console.log(`✓ ${p.platform} ${p.format} — ${p.hook.slice(0, 50)}`);
  } catch (e) {
    p.status = 'error'; p.error = String(e.message).slice(0, 300);
    console.log(`✗ ${p.platform} ${p.format} — ${p.error.slice(0, 120)}`);
  }
}

await writeFile(calUrl, JSON.stringify(plan, null, 2));
console.log(`\n✅ ${ok}/${due.length} veroeffentlicht.`);
