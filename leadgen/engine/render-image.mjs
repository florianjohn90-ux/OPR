// render-image.mjs — erzeugt fuer jeden Kalender-Post automatisch gebrandete Grafiken.
//   format "image"    -> 1 Hook-Card  1080x1350
//   format "carousel" -> 1 Card pro Slide (1080x1350), nummeriert
//   format "reel"     -> uebersprungen (macht render-video.mjs)
// Output: content/assets/...  +  assetPath/assetPaths in calendar.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const W = 1080, H = 1350;
const calUrl = new URL('../content/calendar.json', import.meta.url);
const assetsDir = new URL('../content/assets/', import.meta.url);
await mkdir(assetsDir, { recursive: true });

const plan = JSON.parse(await readFile(calUrl, 'utf8'));

function wrap(text, maxChars) {
  const out = [];
  for (const raw of text.split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean); let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) { out.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    out.push(line.trim());
  }
  return out.filter(Boolean);
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PALETTES = [
  { bg1: '#0e1726', bg2: '#1b2c4e', accent: '#36c08a' },
  { bg1: '#101b14', bg2: '#1d3a2a', accent: '#ffce4d' },
  { bg1: '#1a1426', bg2: '#2c2150', accent: '#7ec8ff' }
];

function card({ headline, idx, badge = '', footer = true, big = false }) {
  const p = PALETTES[idx % PALETTES.length];
  const lines = wrap(headline, big ? 22 : 26);
  const fontSize = big ? (lines.length > 4 ? 64 : 76) : (lines.length > 6 ? 48 : 56);
  const lineH = fontSize * 1.25;
  const startY = H / 2 - (lines.length - 1) * lineH / 2 - (footer ? 40 : 0);
  const tspans = lines.map((l, i) => `<tspan x="90" y="${Math.round(startY + i * lineH)}">${esc(l)}</tspan>`).join('');
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg1}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="60" y="60" width="120" height="10" rx="5" fill="${p.accent}"/>
  <text x="60" y="130" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#eaf1ff">FNF Finanzen</text>
  <text x="60" y="172" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#9fb2d6">Sparen für dein Kind, einfach erklärt</text>
  ${badge ? `<text x="${W - 60}" y="130" text-anchor="end" font-family="Arial" font-size="40" font-weight="800" fill="${p.accent}">${esc(badge)}</text>` : ''}
  <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff">${tspans}</text>
  ${footer ? `<rect x="60" y="${H - 270}" width="${W - 120}" height="2" fill="#2c3e60"/>
  <text x="60" y="${H - 200}" font-family="Arial" font-size="34" font-weight="700" fill="${p.accent}">→ Kostenloses Erstgespräch: Link in Bio</text>
  <text x="60" y="${H - 130}" font-family="Arial" font-size="20" fill="#7388ad">Keine Anlageberatung. Kapitalanlagen bergen Risiken bis hin zum Verlust</text>
  <text x="60" y="${H - 100}" font-family="Arial" font-size="20" fill="#7388ad">des eingesetzten Kapitals. Beispiele ohne Gewähr.</text>` : ''}
</svg>`;
}

async function render(svg, file) {
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(new URL(file, assetsDir).pathname);
  return `content/assets/${file}`;
}

let made = 0;
for (let i = 0; i < plan.length; i++) {
  const post = plan[i];
  if (post.format === 'reel') continue;
  if (post.format === 'carousel' && Array.isArray(post.slides)) {
    if (post.assetPaths?.length === post.slides.length) continue;
    const paths = [];
    for (let s = 0; s < post.slides.length; s++) {
      // Letzte Slide traegt CTA+Disclaimer-Footer, Zwischenslides nicht (mehr Platz).
      const isLast = s === post.slides.length - 1;
      paths.push(await render(
        card({ headline: post.slides[s], idx: i, badge: `${s + 1}/${post.slides.length}`, footer: isLast }),
        `${post.id}-s${s + 1}.jpg`));
      made++;
    }
    post.assetPaths = paths;
  } else {
    if (post.assetPath) continue;
    post.assetPath = await render(card({ headline: post.hook, idx: i, big: true }), `${post.id}.jpg`);
    made++;
  }
}

await writeFile(calUrl, JSON.stringify(plan, null, 2));
console.log(`✅ ${made} Bilder gerendert -> content/assets/ (calendar.json aktualisiert)`);
