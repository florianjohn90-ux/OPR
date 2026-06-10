// render-image.mjs — rendert Grafiken fuer ALLE Marken im jeweiligen Marken-Design.
// Rollierendes Fenster: nur Posts der naechsten RENDER_DAYS Tage (haelt Repo schlank).
//   image    -> 1 Hook-Card 1080x1350    carousel -> 1 Card pro Slide
//   reel     -> uebersprungen (render-video.mjs)
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { renderCard } from './lib/templates.mjs';
import { loadBrands, brandDir } from './lib/brands.mjs';

const RENDER_DAYS = Number(process.env.RENDER_DAYS || 7);
const horizon = Date.now() + RENDER_DAYS * 86400000;
const brands = await loadBrands();

let made = 0;
for (const brand of brands) {
  const dir = await brandDir(brand.id);
  const calUrl = new URL('calendar.json', dir);
  let plan;
  try { plan = JSON.parse(await readFile(calUrl, 'utf8')); } catch { continue; }

  for (const post of plan) {
    if (post.status !== 'scheduled') continue;
    if (new Date(post.scheduledFor).getTime() > horizon) continue;
    if (post.format === 'reel') continue;

    const out = async (svg, file) => {
      await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(new URL('assets/' + file, dir).pathname);
      made++;
      return `content/brands/${brand.id}/assets/${file}`;
    };

    if (post.format === 'carousel' && Array.isArray(post.slides)) {
      if (post.assetPaths?.length === post.slides.length) continue;
      const paths = [];
      for (let s = 0; s < post.slides.length; s++) {
        paths.push(await out(
          renderCard({ text: post.slides[s], badge: `${s + 1}/${post.slides.length}`, footer: s === post.slides.length - 1, brand, seed: post.id + s }),
          `${post.bankId || post.id}-${post.platform}-s${s + 1}.jpg`));
      }
      post.assetPaths = paths;
    } else {
      if (post.assetPath) continue;
      post.assetPath = await out(
        renderCard({ text: post.hook, footer: true, brand, seed: post.id }),
        `${post.bankId || post.id}-${post.platform}.jpg`);
    }
  }
  await writeFile(calUrl, JSON.stringify(plan, null, 2));
}
console.log(`✅ ${made} Bilder gerendert (Fenster: ${RENDER_DAYS} Tage, ${brands.length} Marken).`);
