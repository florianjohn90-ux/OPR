// media-briefs.mjs — erzeugt pro Marke die "Einkaufsliste" fuer Higgsfield:
// alle geplanten Posts der naechsten RENDER_DAYS Tage mit fertigen Bild- und
// Video-Prompts. Ergebnis-Dateien einfach ablegen als:
//   content/brands/<id>/media/<bankId>.jpg   (Bild fuer image/carousel-Cover)
//   content/brands/<id>/media/<bankId>.mp4   (B-Roll fuer Reels)
// -> render-image.mjs komponiert automatisch Marken-Typo darueber.
import { readFile, writeFile } from 'node:fs/promises';
import { loadBrands, brandDir } from './lib/brands.mjs';
import { imagePrompt, videoPrompt } from './lib/visual-prompts.mjs';

const RENDER_DAYS = Number(process.env.RENDER_DAYS || 7);
const horizon = Date.now() + RENDER_DAYS * 86400000;
const brands = await loadBrands();

for (const brand of brands) {
  const dir = await brandDir(brand.id);
  let plan;
  try { plan = JSON.parse(await readFile(new URL('calendar.json', dir), 'utf8')); } catch { continue; }

  // Pro Bank-Post nur EIN Brief (IG+FB teilen sich das Asset).
  const seen = new Set();
  const items = plan.filter(p => {
    if (p.status !== 'scheduled' || new Date(p.scheduledFor).getTime() > horizon) return false;
    if (seen.has(p.bankId)) return false;
    seen.add(p.bankId); return true;
  });
  if (!items.length) continue;

  const md = items.map(p => `## ${p.bankId} — ${p.topic}  _(${p.format}, ${p.angle})_
**Hook:** ${p.hook}
**Datei ablegen als:** \`content/brands/${brand.id}/media/${p.bankId}.${p.format === 'reel' ? 'mp4' : 'jpg'}\`

**Bild-Prompt (4:5):**
\`\`\`
${imagePrompt(brand.id, p)}
\`\`\`
${p.format === 'reel' ? `**Video-Prompt (9:16, ~5s B-Roll):**
\`\`\`
${videoPrompt(brand.id, p)}
\`\`\`
` : ''}`).join('\n---\n\n');

  await writeFile(new URL('media-brief.md', dir),
    `# Higgsfield-Brief: ${brand.name} (${brand.handle})\n\nBildwelt: ${brand.niche}\nDetails: config/visual-direction.md\n\n${md}`);
  await writeFile(new URL('media-brief.json', dir), JSON.stringify(items.map(p => ({
    bankId: p.bankId, format: p.format, topic: p.topic,
    imagePrompt: imagePrompt(brand.id, p),
    videoPrompt: p.format === 'reel' ? videoPrompt(brand.id, p) : null,
    targetFile: `content/brands/${brand.id}/media/${p.bankId}.${p.format === 'reel' ? 'mp4' : 'jpg'}`
  })), null, 2));
  console.log(`✅ ${brand.name}: ${items.length} Briefs -> content/brands/${brand.id}/media-brief.md`);
}
