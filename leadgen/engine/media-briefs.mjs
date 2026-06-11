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

// ---- Higgsfield-PLUS-Budget (1.200 Credits/Monat => ~270/Woche) ----
// Nicht jeder Post bekommt ein Premium-Asset. Priorisiert wird nach Hebel:
// Reels-B-Roll (Watchtime) > Conversion-Images > Rest. Top-Marken zuerst.
// Kosten: Bild (Nano Banana) ~2 Credits, B-Roll (Kling 3.0, ~5-10s) ~8 Credits.
const WEEKLY_CREDITS = Number(process.env.WEEKLY_CREDITS || 270);
const COST = { image: 2, video: 8 };
const TIER = ['fnf', 'elternzeit', 'kindergeldhacks', 'mamamoney', 'paparechnet',
  'sparfuchs', 'mit18frei', 'familienkasse', 'enkelgeld', 'minimoney', 'zukunftskind'];
const FORMAT_PRIO = { reel: 0, image: 1, carousel: 2, list: 9 }; // list braucht kein Foto

// 1) Alle Kandidaten ueber ALLE Marken einsammeln, dann global priorisieren.
const candidates = [];
for (const brand of brands) {
  const dir = await brandDir(brand.id);
  let plan;
  try { plan = JSON.parse(await readFile(new URL('calendar.json', dir), 'utf8')); } catch { continue; }
  const seen = new Set();
  for (const p of plan) {
    if (p.status !== 'scheduled' || new Date(p.scheduledFor).getTime() > horizon) continue;
    if (seen.has(p.bankId)) continue;
    seen.add(p.bankId);
    if (p.format === 'list') continue; // Listicles brauchen kein Foto/Video
    candidates.push({ brand, p, cost: p.format === 'reel' ? COST.video : COST.image });
  }
}

// 2) Priorisieren: Format-Hebel > Marken-Tier > Conversion vor Trust/Engagement.
candidates.sort((a, b) =>
  (FORMAT_PRIO[a.p.format] ?? 5) - (FORMAT_PRIO[b.p.format] ?? 5)
  || TIER.indexOf(a.brand.id) - TIER.indexOf(b.brand.id)
  || (a.p.goal === 'conversion' ? 0 : 1) - (b.p.goal === 'conversion' ? 0 : 1));

// 3) Budget zuteilen.
let spent = 0;
for (const c of candidates) {
  c.inBudget = spent + c.cost <= WEEKLY_CREDITS;
  if (c.inBudget) spent += c.cost;
}
console.log(`Budget: ${spent}/${WEEKLY_CREDITS} Credits verplant, ${candidates.filter(c => c.inBudget).length}/${candidates.length} Assets im Budget.`);

for (const brand of brands) {
  const dir = await brandDir(brand.id);
  const mine = candidates.filter(c => c.brand.id === brand.id);
  const items = mine.filter(c => c.inBudget).map(c => c.p);
  const optional = mine.filter(c => !c.inBudget).map(c => c.p);
  if (!items.length && !optional.length) continue;

  const block = p => `## ${p.bankId} — ${p.topic}  _(${p.format}, ${p.angle})_
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
` : ''}`;

  const md = items.map(block).join('\n---\n\n')
    + (optional.length ? `\n\n# ⏸ Optional (über Wochen-Budget — nur bei Rest-Credits)\n\n${optional.map(block).join('\n---\n\n')}` : '');

  await writeFile(new URL('media-brief.md', dir),
    `# Higgsfield-Brief: ${brand.name} (${brand.handle}) — PLUS-Budget\n\nBildwelt: ${brand.niche}\nDetails: config/visual-direction.md\n\n${md}`);
  await writeFile(new URL('media-brief.json', dir), JSON.stringify([...items.map(p => ({ inBudget: true, p })), ...optional.map(p => ({ inBudget: false, p }))].map(({ inBudget, p }) => ({
    bankId: p.bankId, format: p.format, topic: p.topic, inBudget,
    imagePrompt: imagePrompt(brand.id, p),
    videoPrompt: p.format === 'reel' ? videoPrompt(brand.id, p) : null,
    targetFile: `content/brands/${brand.id}/media/${p.bankId}.${p.format === 'reel' ? 'mp4' : 'jpg'}`
  })), null, 2));
  console.log(`✅ ${brand.name}: ${items.length} im Budget, ${optional.length} optional`);
}
