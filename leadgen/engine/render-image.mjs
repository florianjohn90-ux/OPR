// render-image.mjs — erzeugt fuer jeden Kalender-Post automatisch eine gebrandete
// Hook-Card (1080x1350 JPEG) aus SVG. Kein Designer, kein manueller Schritt.
// Output: content/assets/<postId>.jpg  +  traegt assetPath in calendar.json ein.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const W = 1080, H = 1350;
const calUrl = new URL('../content/calendar.json', import.meta.url);
const assetsDir = new URL('../content/assets/', import.meta.url);
await mkdir(assetsDir, { recursive: true });

const plan = JSON.parse(await readFile(calUrl, 'utf8'));

// Einfacher Zeilenumbruch nach Zeichenbreite (Headline-Font ~ 2 Zeichen pro 1% Breite).
function wrap(text, maxChars) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const PALETTES = [
  { bg1: '#0e1726', bg2: '#1b2c4e', accent: '#36c08a' },
  { bg1: '#101b14', bg2: '#1d3a2a', accent: '#ffce4d' },
  { bg1: '#1a1426', bg2: '#2c2150', accent: '#7ec8ff' }
];

function svgFor(post, idx) {
  const p = PALETTES[idx % PALETTES.length];
  const lines = wrap(post.hook, 22);
  const fontSize = lines.length > 4 ? 64 : 76;
  const lineH = fontSize * 1.22;
  const startY = H / 2 - (lines.length - 1) * lineH / 2 - 40;
  const tspans = lines.map((l, i) =>
    `<tspan x="90" y="${Math.round(startY + i * lineH)}">${esc(l)}</tspan>`).join('');
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg1}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="60" y="60" width="120" height="10" rx="5" fill="${p.accent}"/>
  <text x="60" y="130" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#eaf1ff">FNF Finanzen</text>
  <text x="60" y="172" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#9fb2d6">Sparen für dein Kind, einfach erklärt</text>
  <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff">${tspans}</text>
  <rect x="60" y="${H - 270}" width="${W - 120}" height="2" fill="#2c3e60"/>
  <text x="60" y="${H - 200}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${p.accent}">→ Kostenloses Erstgespräch: Link in Bio</text>
  <text x="60" y="${H - 130}" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#7388ad">Keine Anlageberatung. Kapitalanlagen bergen Risiken bis hin zum Verlust</text>
  <text x="60" y="${H - 100}" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#7388ad">des eingesetzten Kapitals. Beispiele ohne Gewähr.</text>
</svg>`;
}

let made = 0;
for (let i = 0; i < plan.length; i++) {
  const post = plan[i];
  if (post.assetPath) continue;
  const file = `${post.id || 'post-' + i}.jpg`;
  await sharp(Buffer.from(svgFor(post, i))).jpeg({ quality: 88 }).toFile(new URL(file, assetsDir).pathname);
  post.assetPath = `content/assets/${file}`;
  made++;
}

await writeFile(calUrl, JSON.stringify(plan, null, 2));
console.log(`✅ ${made} Bilder gerendert -> content/assets/ (calendar.json aktualisiert)`);
