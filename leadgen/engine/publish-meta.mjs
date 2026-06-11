// publish-meta.mjs — Multi-Brand-Publisher. Postet faellige Posts ALLER Marken
// auf deren jeweilige FB-Seite + IG-Account (Credentials: BRANDS_META_JSON).
// Marken ohne hinterlegte Zugaenge werden uebersprungen (sauber geloggt).
//
//   node publish-meta.mjs            -> live posten
//   node publish-meta.mjs --review   -> content/to-post.md schreiben, nichts posten
import { readFile, writeFile } from 'node:fs/promises';
import { loadBrands, credsFor, brandDir } from './lib/brands.mjs';

const REVIEW = process.argv.includes('--review');
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const ASSET_BASE = (process.env.PUBLIC_ASSET_BASE || '').replace(/\/$/, '');
const rootUrl = new URL('../', import.meta.url);
const brands = await loadBrands();

const text = p => `${p.caption || p.hook}\n\n${(p.hashtags || []).join(' ')}`.trim();

function api(token) {
  const json = async (path, body) => {
    const res = await fetch(`https://graph.facebook.com/${V}/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: token })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
    return data;
  };
  const upload = async (path, fields, buf, name, mime) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
    fd.append('access_token', token);
    fd.append('source', new Blob([buf], { type: mime }), name);
    const res = await fetch(`https://graph.facebook.com/${V}/${path}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
    return data;
  };
  const wait = async (id, tries = 30) => {
    for (let i = 0; i < tries; i++) {
      const res = await fetch(`https://graph.facebook.com/${V}/${id}?fields=status_code&access_token=${token}`);
      const d = await res.json();
      if (d.status_code === 'FINISHED') return;
      if (d.status_code === 'ERROR') throw new Error('IG-Container-Fehler');
      await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('IG-Container Timeout');
  };
  return { json, upload, wait };
}

async function publishOne(p, creds) {
  const { json, upload, wait } = api(creds.pageToken);
  const isVideo = !!p.assetPath?.endsWith('.mp4'); // reel ODER list-als-Standbild-Video
  if (p.platform === 'facebook') {
    if (p.format === 'carousel' && p.assetPaths?.length) {
      const ids = [];
      for (const rel of p.assetPaths) {
        const buf = await readFile(new URL(rel, rootUrl));
        ids.push((await upload(`${creds.pageId}/photos`, { published: 'false' }, buf, rel.split('/').pop(), 'image/jpeg')).id);
      }
      await json(`${creds.pageId}/feed`, { message: text(p), attached_media: ids.map(id => ({ media_fbid: id })) });
    } else if (isVideo) {
      const buf = await readFile(new URL(p.assetPath, rootUrl));
      await upload(`${creds.pageId}/videos`, { description: text(p) }, buf, 'reel.mp4', 'video/mp4');
    } else if (p.assetPath) {
      const buf = await readFile(new URL(p.assetPath, rootUrl));
      await upload(`${creds.pageId}/photos`, { caption: text(p) }, buf, 'post.jpg', 'image/jpeg');
    } else {
      await json(`${creds.pageId}/feed`, { message: text(p) });
    }
  } else if (p.platform === 'instagram') {
    if (!creds.igUserId) throw new Error('igUserId fehlt');
    if (!ASSET_BASE) throw new Error('PUBLIC_ASSET_BASE fehlt');
    const url = rel => `${ASSET_BASE}/${rel}`;
    if (p.format === 'carousel' && p.assetPaths?.length) {
      const children = [];
      for (const rel of p.assetPaths)
        children.push((await json(`${creds.igUserId}/media`, { image_url: url(rel), is_carousel_item: true })).id);
      const parent = await json(`${creds.igUserId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: text(p) });
      await json(`${creds.igUserId}/media_publish`, { creation_id: parent.id });
    } else if (isVideo) {
      const c = await json(`${creds.igUserId}/media`, { media_type: 'REELS', video_url: url(p.assetPath), caption: text(p) });
      await wait(c.id);
      await json(`${creds.igUserId}/media_publish`, { creation_id: c.id });
    } else if (p.assetPath) {
      const c = await json(`${creds.igUserId}/media`, { image_url: url(p.assetPath), caption: text(p) });
      await json(`${creds.igUserId}/media_publish`, { creation_id: c.id });
    } else throw new Error('IG-Post ohne Asset');
  }
}

const now = Date.now();
let ok = 0, failed = 0, reviewMd = '';

for (const brand of brands) {
  const dir = await brandDir(brand.id);
  const calUrl = new URL('calendar.json', dir);
  let plan;
  try { plan = JSON.parse(await readFile(calUrl, 'utf8')); } catch { continue; }
  const due = plan.filter(p => p.status === 'scheduled' && new Date(p.scheduledFor).getTime() <= now);
  if (!due.length) continue;

  if (REVIEW) {
    reviewMd += due.map(p => `## [${brand.name} · ${p.platform} · ${p.format}] ${p.scheduledFor}\n${text(p)}\n`).join('\n---\n') + '\n---\n';
    continue;
  }

  const creds = credsFor(brand.id);
  if (!creds) { console.log(`⏭  ${brand.name}: keine Zugangsdaten (BRANDS_META_JSON) — ${due.length} Posts warten.`); continue; }

  // Warm-up-Rampe: frische Accounts posten gedrosselt (Tag 1-3: 1/Tag/Plattform,
  // Tag 4-7: 2, danach voll) — neue Accounts mit Vollgas wirken wie Spam-Netzwerke.
  const posted = plan.filter(p => p.status === 'posted');
  const firstPost = posted.reduce((m, p) => Math.min(m, new Date(p.postedAt).getTime()), Infinity);
  const ageDays = firstPost === Infinity ? 0 : (Date.now() - firstPost) / 86400000;
  const maxPerDay = ageDays < 3 ? 1 : ageDays < 7 ? 2 : Infinity;
  const todayCount = plat => posted.filter(p => p.platform === plat
    && Date.now() - new Date(p.postedAt).getTime() < 86400000).length;

  for (const p of due) {
    if (todayCount(p.platform) >= maxPerDay) {
      console.log(`🐢 [${brand.id}] ${p.platform} Warm-up-Limit (${maxPerDay}/Tag) — ${p.id} wartet`);
      continue;
    }
    if ((p.format === 'reel' || p.format === 'list') && !p.assetPath) { console.log(`… ${brand.id}/${p.id} wartet auf Video`); continue; }
    if (p.platform !== 'facebook' && !p.assetPath && !p.assetPaths) { console.log(`… ${brand.id}/${p.id} wartet auf Bild`); continue; }
    try {
      await publishOne(p, creds);
      p.status = 'posted'; p.postedAt = new Date().toISOString(); ok++;
      console.log(`✓ [${brand.id}] ${p.platform} ${p.format} — ${p.hook.slice(0, 40)}`);
    } catch (e) {
      p.status = 'error'; p.error = String(e.message).slice(0, 300); failed++;
      console.log(`✗ [${brand.id}] ${p.platform} — ${p.error.slice(0, 100)}`);
    }
  }
  await writeFile(calUrl, JSON.stringify(plan, null, 2));
}

if (REVIEW) {
  await writeFile(new URL('../content/to-post.md', import.meta.url), `# Jetzt zu posten\n\n${reviewMd || 'Nichts faellig.'}`);
  console.log('📝 Review -> content/to-post.md');
} else {
  console.log(`\n✅ ${ok} veroeffentlicht, ${failed} Fehler.`);
}
