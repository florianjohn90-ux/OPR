// stats.mjs — sammelt taeglich die Kennzahlen aller Marken:
// Follower/Fans (FB+IG), Posts/Fehler aus den Kalendern, Eskalationen.
// Output: content/stats.json (aktuell) + content/stats-history.ndjson (Verlauf).
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { loadBrands, credsFor, brandDir } from './lib/brands.mjs';

const V = process.env.META_GRAPH_VERSION || 'v21.0';
const brands = await loadBrands();

async function graph(path, token, params = {}) {
  const q = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`https://graph.facebook.com/${V}/${path}?${q}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data).slice(0, 120));
  return data;
}

const snapshot = { ts: new Date().toISOString(), brands: {}, totals: {} };
let tPosted = 0, tErrors = 0, tScheduled = 0, tFb = 0, tIg = 0;

for (const brand of brands) {
  const b = { name: brand.name, fbFans: null, igFollowers: null, posted7d: 0, errors: 0, scheduled: 0, connected: false };
  const creds = credsFor(brand.id);

  if (creds) {
    b.connected = true;
    try { b.fbFans = (await graph(creds.pageId, creds.pageToken, { fields: 'fan_count' })).fan_count ?? null; } catch {}
    try { if (creds.igUserId) b.igFollowers = (await graph(creds.igUserId, creds.pageToken, { fields: 'followers_count' })).followers_count ?? null; } catch {}
  }

  try {
    const dir = await brandDir(brand.id);
    const cal = JSON.parse(await readFile(new URL('calendar.json', dir), 'utf8'));
    const weekAgo = Date.now() - 7 * 86400000;
    b.posted7d = cal.filter(p => p.status === 'posted' && new Date(p.postedAt).getTime() > weekAgo).length;
    b.errors = cal.filter(p => p.status === 'error').length;
    b.scheduled = cal.filter(p => p.status === 'scheduled').length;
  } catch {}

  snapshot.brands[brand.id] = b;
  tPosted += b.posted7d; tErrors += b.errors; tScheduled += b.scheduled;
  tFb += b.fbFans || 0; tIg += b.igFollowers || 0;
}

let escalations = 0;
try {
  const e = await readFile(new URL('../data/escalations.ndjson', import.meta.url), 'utf8');
  escalations = e.trim().split('\n').filter(Boolean).length;
} catch {}

snapshot.totals = {
  posted7d: tPosted, errors: tErrors, scheduled: tScheduled,
  fbFans: tFb, igFollowers: tIg, followersTotal: tFb + tIg,
  escalationsOpen: escalations,
  connectedBrands: Object.values(snapshot.brands).filter(b => b.connected).length
};

const dir = new URL('../content/', import.meta.url);
await writeFile(new URL('stats.json', dir), JSON.stringify(snapshot, null, 2));
await appendFile(new URL('stats-history.ndjson', dir), JSON.stringify(snapshot) + '\n');
console.log('✅ Stats:', JSON.stringify(snapshot.totals));
