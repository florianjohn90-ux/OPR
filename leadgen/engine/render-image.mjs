// render-image.mjs — rendert Grafiken fuer ALLE Marken im jeweiligen Marken-Design.
// Rollierendes Fenster: nur Posts der naechsten RENDER_DAYS Tage (haelt Repo schlank).
//   image    -> 1 Hook-Card 1080x1350    carousel -> 1 Card pro Slide
//   reel     -> uebersprungen (render-video.mjs)
import { readFile, writeFile, access } from 'node:fs/promises';
import sharp from 'sharp';
import { renderCard, photoOverlay } from './lib/templates.mjs';
import { loadBrands, brandDir } from './lib/brands.mjs';

// Higgsfield-Foto vorhanden? -> Composite statt Grafik-Card.
async function mediaFor(dir, bankId) {
  try {
    const p = new URL(`media/${bankId}.jpg`, dir).pathname;
    await access(p);
    return p;
  } catch { return null; }
}

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
    // Premium-Pfad: Higgsfield-Foto + Marken-Typo-Overlay.
    const outPhoto = async (photoPath, svg, file) => {
      const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
      await sharp(photoPath).resize(1080, 1350, { fit: 'cover' })
        .composite([{ input: overlay }]).jpeg({ quality: 88 })
        .toFile(new URL('assets/' + file, dir).pathname);
      made++;
      return `content/brands/${brand.id}/assets/${file}`;
    };
    const media = await mediaFor(dir, post.bankId);

    if (post.format === 'carousel' && Array.isArray(post.slides)) {
      if (post.assetPaths?.length === post.slides.length && post.usedMedia === !!media) continue;
      const paths = [];
      for (let s = 0; s < post.slides.length; s++) {
        const file = `${post.bankId || post.id}-${post.platform}-s${s + 1}.jpg`;
        // Cover-Slide bekommt das Foto, Folge-Slides bleiben Marken-Cards.
        if (s === 0 && media) paths.push(await outPhoto(media, photoOverlay({ text: post.slides[0], brand, footer: false }), file));
        else paths.push(await out(renderCard({ text: post.slides[s], badge: `${s + 1}/${post.slides.length}`, footer: s === post.slides.length - 1, brand, seed: post.id + s }), file));
      }
      post.assetPaths = paths; post.usedMedia = !!media;
    } else {
      if (post.assetPath && post.usedMedia === !!media) continue;
      const file = `${post.bankId || post.id}-${post.platform}.jpg`;
      post.assetPath = media
        ? await outPhoto(media, photoOverlay({ text: post.hook, brand, footer: true }), file)
        : await out(renderCard({ text: post.hook, footer: true, brand, seed: post.id }), file);
      post.usedMedia = !!media;
    }
  }
  await writeFile(calUrl, JSON.stringify(plan, null, 2));
}
console.log(`✅ ${made} Bilder gerendert (Fenster: ${RENDER_DAYS} Tage, ${brands.length} Marken).`);
