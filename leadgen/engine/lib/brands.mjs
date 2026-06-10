// brands.mjs — laedt Markenprofile und loest Zugangsdaten pro Marke auf.
// Credentials kommen aus EINEM Secret: BRANDS_META_JSON =
//   {"fnf":{"pageId":"...","pageToken":"...","igUserId":"..."}, "mamamoney":{...}, ...}
// Fallback fuer "fnf": die alten Einzel-Secrets META_PAGE_ID/META_PAGE_TOKEN/META_IG_USER_ID.
import { readFile, mkdir } from 'node:fs/promises';

export async function loadBrands() {
  return JSON.parse(await readFile(new URL('../../config/brands.json', import.meta.url), 'utf8'));
}

export function credsFor(brandId) {
  let map = {};
  try { map = JSON.parse(process.env.BRANDS_META_JSON || '{}'); } catch {}
  const c = map[brandId];
  if (c?.pageId && c?.pageToken) return c;
  if (brandId === 'fnf' && process.env.META_PAGE_ID && process.env.META_PAGE_TOKEN) {
    return { pageId: process.env.META_PAGE_ID, pageToken: process.env.META_PAGE_TOKEN, igUserId: process.env.META_IG_USER_ID };
  }
  return null;
}

export async function brandDir(brandId) {
  const dir = new URL(`../../content/brands/${brandId}/`, import.meta.url);
  await mkdir(new URL('assets/', dir), { recursive: true });
  return dir;
}
