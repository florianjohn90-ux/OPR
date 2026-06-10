// templates.mjs — 10 eigenstaendige Design-Welten, eine pro Marke.
// Ziel: jede Marke sieht handgemacht und anders aus — verschiedene Kompositionen,
// Schriftmischungen, Rotationen, Papier-/Tape-/Sticker-Elemente, bewusste
// "Unperfektheit" (leichte Schraegstellungen, versetzte Elemente) statt Template-Look.
// Alle Funktionen: (ctx) => SVG-String. ctx = { W,H, text, badge, footer, brand, seed }

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Deterministischer Pseudo-Zufall pro Post (seed = Post-ID) — Layout variiert
// minimal von Post zu Post, wie von Hand gesetzt, aber reproduzierbar.
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h >>> 16) & 1023) / 1023; };
}

export function wrap(text, maxChars) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean); let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) { out.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    out.push(line.trim());
  }
  return out.filter(Boolean);
}

function lines2tspans(lines, x, startY, lineH, anchor = 'start') {
  return lines.map((l, i) => `<tspan x="${x}" y="${Math.round(startY + i * lineH)}" text-anchor="${anchor}">${esc(l)}</tspan>`).join('');
}

function footerBlock(c, color, dimColor, y) {
  if (!c.footer) return '';
  return `<text x="${c.W / 2}" y="${y}" text-anchor="middle" font-family="${c.brand.fontBody}" font-size="30" font-weight="700" fill="${color}">${esc(c.brand.cta)}</text>
  <text x="${c.W / 2}" y="${y + 52}" text-anchor="middle" font-family="${c.brand.fontBody}" font-size="17" fill="${dimColor}">Keine Anlageberatung · Kapitalanlagen bergen Risiken bis hin zum Kapitalverlust</text>`;
}

/* ---------- 1. dark-fintech (FNF Hauptmarke) ---------- */
function darkFintech(c) {
  const p = c.brand.palette;
  const lines = wrap(c.text, 22);
  const fs = lines.length > 4 ? 62 : 74, lh = fs * 1.24;
  const sy = c.H / 2 - (lines.length - 1) * lh / 2 - 30;
  return `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg}"/></linearGradient></defs>
  <rect width="${c.W}" height="${c.H}" fill="url(#g)"/>
  <rect x="60" y="64" width="110" height="9" rx="4" fill="${p.accent}"/>
  <text x="60" y="128" font-family="${c.brand.fontHead}" font-size="33" font-weight="700" fill="${p.ink}">${esc(c.brand.name)}</text>
  <text x="60" y="168" font-family="${c.brand.fontBody}" font-size="25" fill="${p.dim}">${esc(c.brand.tagline)}</text>
  ${c.badge ? `<text x="${c.W - 60}" y="128" text-anchor="end" font-family="${c.brand.fontHead}" font-size="38" font-weight="800" fill="${p.accent}">${esc(c.badge)}</text>` : ''}
  <text font-family="${c.brand.fontHead}" font-size="${fs}" font-weight="800" fill="#ffffff">${lines2tspans(lines, 90, sy, lh)}</text>
  ${c.footer ? `<rect x="60" y="${c.H - 250}" width="${c.W - 120}" height="2" fill="#2c3e60"/>` : ''}${footerBlock(c, p.accent, '#7388ad', c.H - 180)}`;
}

/* ---------- 2. soft-pastel (Mama & Moneten) ---------- */
function softPastel(c) {
  const p = c.brand.palette, r = rng(c.seed);
  const lines = wrap(c.text, 20);
  const fs = lines.length > 4 ? 54 : 64, lh = fs * 1.3;
  const sy = c.H / 2 - (lines.length - 1) * lh / 2;
  const tilt = (r() - 0.5) * 2.4;
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <ellipse cx="${140 + r() * 80}" cy="${180 + r() * 60}" rx="220" ry="180" fill="${p.bg2}"/>
  <ellipse cx="${c.W - 120}" cy="${c.H - 200}" rx="260" ry="210" fill="${p.accent2}" opacity="0.35"/>
  <g transform="rotate(${tilt} ${c.W / 2} ${c.H / 2})">
    <rect x="100" y="${sy - fs - 70}" width="${c.W - 200}" height="${lines.length * lh + 130}" rx="38" fill="${p.paper}" stroke="${p.accent}" stroke-width="1.5" opacity="0.96"/>
    <text font-family="${c.brand.fontHead}" font-size="${fs}" font-weight="700" fill="${p.ink}" font-style="italic">${lines2tspans(lines, c.W / 2, sy, lh, 'middle')}</text>
  </g>
  <text x="${c.W / 2}" y="150" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="40" font-style="italic" fill="${p.accent}">${esc(c.brand.name)} ${c.brand.emoji}</text>
  ${c.badge ? `<circle cx="${c.W - 110}" cy="120" r="52" fill="${p.accent}"/><text x="${c.W - 110}" y="135" text-anchor="middle" font-family="${c.brand.fontBody}" font-size="36" font-weight="700" fill="#fff">${esc(c.badge)}</text>` : ''}
  ${footerBlock(c, p.accent, p.dim, c.H - 150)}`;
}

/* ---------- 3. bold-mag (Papa rechnet) ---------- */
function boldMag(c) {
  const p = c.brand.palette;
  const lines = wrap(c.text.toUpperCase(), 16);
  const fs = lines.length > 4 ? 66 : 84, lh = fs * 1.06;
  const sy = 420;
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <rect x="0" y="0" width="${c.W}" height="14" fill="${p.accent}"/>
  <text x="70" y="150" font-family="${c.brand.fontHead}" font-size="54" font-weight="900" fill="${p.accent}">${esc(c.brand.name.toUpperCase())}</text>
  <text x="70" y="200" font-family="${c.brand.fontBody}" font-size="26" fill="${p.dim}" letter-spacing="4">${esc(c.brand.tagline.toUpperCase())}</text>
  ${c.badge ? `<rect x="${c.W - 220}" y="90" width="150" height="68" fill="${p.accent}"/><text x="${c.W - 145}" y="138" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="38" font-weight="900" fill="${p.bg}">${esc(c.badge)}</text>` : ''}
  <rect x="70" y="${sy - fs - 40}" width="170" height="20" fill="${p.accent}"/>
  <text font-family="${c.brand.fontHead}" font-size="${fs}" font-weight="900" fill="${p.ink}">${lines2tspans(lines, 70, sy, lh)}</text>
  <text x="70" y="${c.H - 230}" font-family="${c.brand.fontBody}" font-size="24" fill="${p.dim}">— nachgerechnet, nicht versprochen</text>
  ${footerBlock(c, p.accent, p.dim, c.H - 150)}`;
}

/* ---------- 4. sticky-grid (Sparfuchs-Familie) ---------- */
function stickyGrid(c) {
  const p = c.brand.palette, r = rng(c.seed);
  const lines = wrap(c.text, 18);
  const fs = lines.length > 4 ? 50 : 58, lh = fs * 1.3;
  const noteH = lines.length * lh + 160;
  const tilt = (r() - 0.5) * 5;
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <rect x="40" y="40" width="${c.W - 80}" height="${c.H - 80}" fill="none" stroke="${p.dim}" stroke-width="2" stroke-dasharray="14 10" opacity="0.4"/>
  <g transform="rotate(${-4 + r() * 2} 260 210)"><rect x="120" y="120" width="280" height="150" fill="${p.accent2}" opacity="0.8"/><text x="260" y="205" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="34" fill="#fff" font-weight="700">${esc(c.brand.emoji)} Spar-Tipp</text></g>
  <g transform="rotate(${tilt} ${c.W / 2} ${c.H / 2})">
    <rect x="110" y="${(c.H - noteH) / 2}" width="${c.W - 220}" height="${noteH}" fill="${p.paper}" stroke="#d9cf8a" stroke-width="1"/>
    <rect x="${c.W / 2 - 90}" y="${(c.H - noteH) / 2 - 22}" width="180" height="44" fill="${p.accent}" opacity="0.55" transform="rotate(-2 ${c.W / 2} ${(c.H - noteH) / 2})"/>
    <text font-family="${c.brand.fontHead}" font-size="${fs}" font-weight="700" fill="${p.ink}">${lines2tspans(lines, c.W / 2, (c.H - noteH) / 2 + 120, lh, 'middle')}</text>
  </g>
  <text x="${c.W - 80}" y="${c.H - 220}" text-anchor="end" font-family="${c.brand.fontHead}" font-size="36" fill="${p.accent}" transform="rotate(-2 ${c.W - 80} ${c.H - 220})">${esc(c.brand.name)}</text>
  ${c.badge ? `<text x="100" y="${c.H - 220}" font-family="${c.brand.fontHead}" font-size="40" font-weight="700" fill="${p.ink}">${esc(c.badge)}</text>` : ''}
  ${footerBlock(c, p.accent, p.dim, c.H - 140)}`;
}

/* ---------- 5. paper-notes (Enkelgeld) ---------- */
function paperNotes(c) {
  const p = c.brand.palette, r = rng(c.seed);
  const lines = wrap(c.text, 22);
  const fs = lines.length > 4 ? 52 : 60, lh = fs * 1.4;
  const sy = c.H / 2 - (lines.length - 1) * lh / 2;
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <rect x="70" y="90" width="${c.W - 140}" height="${c.H - 180}" fill="${p.paper}" stroke="#e0d8c4" stroke-width="2"/>
  ${Array.from({ length: 14 }, (_, i) => `<line x1="130" y1="${260 + i * 64}" x2="${c.W - 130}" y2="${260 + i * 64}" stroke="#e8e0cc" stroke-width="1.5"/>`).join('')}
  <rect x="${c.W / 2 - 110}" y="62" width="220" height="56" fill="#e9dcb8" opacity="0.85" transform="rotate(${-2 + r() * 4} ${c.W / 2} 90)"/>
  <text x="${c.W / 2}" y="200" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="42" font-style="italic" fill="${p.accent}">${esc(c.brand.name)} ${c.brand.emoji}</text>
  <text font-family="${c.brand.fontHead}" font-size="${fs}" font-style="italic" fill="${p.ink}">${lines2tspans(lines, c.W / 2, sy + 20, lh, 'middle')}</text>
  ${c.badge ? `<text x="${c.W - 150}" y="190" text-anchor="end" font-family="${c.brand.fontHead}" font-size="34" fill="${p.dim}">Seite ${esc(c.badge)}</text>` : ''}
  ${footerBlock(c, p.accent, p.dim, c.H - 160)}`;
}

/* ---------- 6. chat-style (Elternzeit & Euros) ---------- */
function chatStyle(c) {
  const p = c.brand.palette;
  const parts = wrap(c.text, 24);
  // Zeilen zu 2-3 Chat-Bubbles gruppieren.
  const bubbles = [];
  for (let i = 0; i < parts.length; i += Math.ceil(parts.length / Math.min(3, parts.length)))
    bubbles.push(parts.slice(i, i + Math.ceil(parts.length / Math.min(3, parts.length))));
  let y = 360, out = '';
  bubbles.forEach((b, bi) => {
    const bh = b.length * 52 + 56;
    const bw = Math.min(c.W - 260, Math.max(...b.map(l => l.length)) * 23 + 90);
    const left = bi % 2 === 0;
    const x = left ? 90 : c.W - 90 - bw;
    out += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="30" fill="${left ? p.paper : p.accent2}"/>
    <text font-family="${c.brand.fontBody}" font-size="40" fill="${p.ink}">${b.map((l, i) => `<tspan x="${x + 44}" y="${y + 70 + i * 52}">${esc(l)}</tspan>`).join('')}</text>
    <text x="${x + bw - 90}" y="${y + bh - 18}" font-family="${c.brand.fontBody}" font-size="20" fill="${p.dim}">${9 + bi}:4${bi} ✓✓</text>`;
    y += bh + 36;
  });
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <rect x="0" y="0" width="${c.W}" height="190" fill="${p.accent}"/>
  <circle cx="120" cy="115" r="44" fill="${p.paper}"/><text x="120" y="132" text-anchor="middle" font-size="44">${esc(c.brand.emoji)}</text>
  <text x="195" y="105" font-family="${c.brand.fontHead}" font-size="36" font-weight="700" fill="#fff">${esc(c.brand.name)}</text>
  <text x="195" y="148" font-family="${c.brand.fontBody}" font-size="24" fill="#dfeedd">online</text>
  ${c.badge ? `<text x="${c.W - 70}" y="120" text-anchor="end" font-family="${c.brand.fontBody}" font-size="34" font-weight="700" fill="#fff">${esc(c.badge)}</text>` : ''}
  ${out}
  ${footerBlock(c, p.accent, p.dim, c.H - 140)}`;
}

/* ---------- 7. newsprint (Kindergeld-Hacks) ---------- */
function newsprint(c) {
  const p = c.brand.palette;
  const lines = wrap(c.text, 18);
  const fs = lines.length > 4 ? 58 : 70, lh = fs * 1.12;
  const sy = 470;
  return `<rect width="${c.W}" height="${c.H}" fill="${p.paper}"/>
  <rect x="60" y="60" width="${c.W - 120}" height="4" fill="${p.ink}"/>
  <rect x="60" y="72" width="${c.W - 120}" height="2" fill="${p.ink}"/>
  <text x="${c.W / 2}" y="160" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="64" font-weight="900" fill="${p.ink}">${esc(c.brand.name.toUpperCase())}</text>
  <text x="${c.W / 2}" y="210" text-anchor="middle" font-family="${c.brand.fontBody}" font-size="22" fill="${p.dim}" letter-spacing="3">UNABHÄNGIG · VERSTÄNDLICH · FÜR ELTERN${c.badge ? ` · TEIL ${esc(c.badge)}` : ''}</text>
  <rect x="60" y="240" width="${c.W - 120}" height="2" fill="${p.ink}"/>
  <rect x="60" y="290" width="265" height="46" fill="${p.accent}"/>
  <text x="80" y="324" font-family="${c.brand.fontBody}" font-size="28" font-weight="700" fill="#fff">AUFGEDECKT</text>
  <text font-family="${c.brand.fontHead}" font-size="${fs}" font-weight="900" fill="${p.ink}">${lines2tspans(lines, 60, sy, lh)}</text>
  <line x1="60" y1="${c.H - 260}" x2="${c.W - 60}" y2="${c.H - 260}" stroke="${p.ink}" stroke-width="2"/>
  ${footerBlock(c, p.accent, p.dim, c.H - 170)}`;
}

/* ---------- 8. clean-minimal (projekt zukunftskind) ---------- */
function cleanMinimal(c) {
  const p = c.brand.palette;
  const lines = wrap(c.text.toLowerCase(), 24);
  const fs = lines.length > 4 ? 50 : 58, lh = fs * 1.5;
  const sy = c.H / 2 - (lines.length - 1) * lh / 2;
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <circle cx="${c.W / 2}" cy="170" r="10" fill="${p.accent}"/>
  <text x="${c.W / 2}" y="240" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="26" fill="${p.dim}" letter-spacing="6">${esc(c.brand.name)}</text>
  <text font-family="${c.brand.fontHead}" font-size="${fs}" font-weight="300" fill="${p.ink}">${lines2tspans(lines, c.W / 2, sy, lh, 'middle')}</text>
  ${c.badge ? `<text x="${c.W / 2}" y="${c.H - 280}" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="24" fill="${p.dim}">${esc(c.badge)}</text>` : ''}
  <line x1="${c.W / 2 - 40}" y1="${c.H - 240}" x2="${c.W / 2 + 40}" y2="${c.H - 240}" stroke="${p.accent}" stroke-width="2"/>
  ${footerBlock(c, p.accent, p.dim, c.H - 160)}`;
}

/* ---------- 9. polaroid (Team Familienkasse) ---------- */
function polaroid(c) {
  const p = c.brand.palette, r = rng(c.seed);
  const lines = wrap(c.text, 19);
  const fs = lines.length > 4 ? 48 : 56, lh = fs * 1.32;
  const innerH = lines.length * lh + 120;
  const tilt = (r() - 0.5) * 4.5;
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <rect x="0" y="${c.H - 320}" width="${c.W}" height="320" fill="${p.bg2}"/>
  <g transform="rotate(${tilt} ${c.W / 2} ${c.H / 2 - 60})">
    <rect x="100" y="160" width="${c.W - 200}" height="${innerH + 240}" fill="#ffffff" stroke="#d8d2c6" stroke-width="1"/>
    <rect x="130" y="190" width="${c.W - 260}" height="${innerH}" fill="${p.accent2}" opacity="0.16"/>
    <text font-family="${c.brand.fontHead}" font-size="${fs}" font-style="italic" fill="${p.ink}">${lines2tspans(lines, c.W / 2, 300, lh, 'middle')}</text>
    <text x="${c.W / 2}" y="${190 + innerH + 110}" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="38" font-style="italic" fill="${p.accent}">${esc(c.brand.emoji)} ${esc(c.brand.name)}</text>
  </g>
  <rect x="${c.W / 2 - 80}" y="130" width="160" height="48" fill="#e6ddca" opacity="0.9" transform="rotate(${-3 + r() * 6} ${c.W / 2} 154)"/>
  ${c.badge ? `<text x="${c.W - 90}" y="${c.H - 250}" text-anchor="end" font-family="${c.brand.fontBody}" font-size="36" font-weight="700" fill="${p.ink}">${esc(c.badge)}</text>` : ''}
  ${footerBlock(c, p.accent, p.dim, c.H - 130)}`;
}

/* ---------- 10. warm-photo (Mit 18 frei) ---------- */
function warmPhoto(c) {
  const p = c.brand.palette;
  const lines = wrap(c.text, 20);
  const fs = lines.length > 4 ? 54 : 64, lh = fs * 1.34;
  const sy = c.H / 2 - (lines.length - 1) * lh / 2 + 40;
  return `<defs><radialGradient id="w" cx="0.5" cy="0.25" r="1.1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg}"/></radialGradient></defs>
  <rect width="${c.W}" height="${c.H}" fill="url(#w)"/>
  <circle cx="${c.W / 2}" cy="250" r="120" fill="${p.accent}" opacity="0.22"/>
  <circle cx="${c.W / 2}" cy="250" r="76" fill="${p.accent}" opacity="0.3"/>
  <text x="${c.W / 2}" y="272" text-anchor="middle" font-size="64">${esc(c.brand.emoji)}</text>
  <text x="120" y="${sy - fs - 30}" font-family="${c.brand.fontHead}" font-size="120" fill="${p.accent}" opacity="0.6">„</text>
  <text font-family="${c.brand.fontHead}" font-size="${fs}" font-style="italic" fill="${p.ink}">${lines2tspans(lines, c.W / 2, sy, lh, 'middle')}</text>
  <text x="${c.W / 2}" y="${c.H - 280}" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="34" fill="${p.dim}" letter-spacing="3">— ${esc(c.brand.name.toUpperCase())} —</text>
  ${c.badge ? `<text x="${c.W - 80}" y="140" text-anchor="end" font-family="${c.brand.fontHead}" font-size="36" fill="${p.dim}">${esc(c.badge)}</text>` : ''}
  ${footerBlock(c, p.accent, p.dim, c.H - 170)}`;
}

/* ---------- 11. playful-shapes (MiniMoney Club) ---------- */
function playfulShapes(c) {
  const p = c.brand.palette, r = rng(c.seed);
  const lines = wrap(c.text, 19);
  const fs = lines.length > 4 ? 52 : 62, lh = fs * 1.3;
  const sy = c.H / 2 - (lines.length - 1) * lh / 2 + 20;
  const shapes = Array.from({ length: 7 }, () => {
    const kinds = [
      `<circle cx="${80 + r() * (c.W - 160)}" cy="${80 + r() * 240}" r="${18 + r() * 26}" fill="${r() > 0.5 ? p.accent : p.accent2}" opacity="0.55"/>`,
      `<rect x="${80 + r() * (c.W - 200)}" y="${c.H - 340 + r() * 120}" width="${30 + r() * 34}" height="${30 + r() * 34}" rx="9" fill="${r() > 0.5 ? p.accent2 : p.accent}" opacity="0.5" transform="rotate(${r() * 40} ${c.W / 2} ${c.H / 2})"/>`
    ];
    return kinds[Math.floor(r() * 2)];
  }).join('');
  return `<rect width="${c.W}" height="${c.H}" fill="${p.bg}"/>
  <rect x="50" y="50" width="${c.W - 100}" height="${c.H - 100}" rx="48" fill="${p.bg2}" opacity="0.6"/>
  ${shapes}
  <text x="${c.W / 2}" y="180" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="44" font-weight="700" fill="${p.accent}">${esc(c.brand.emoji)} ${esc(c.brand.name)}</text>
  <rect x="130" y="${sy - fs - 60}" width="${c.W - 260}" height="${lines.length * lh + 110}" rx="40" fill="${p.paper}" stroke="${p.accent2}" stroke-width="5"/>
  <text font-family="${c.brand.fontHead}" font-size="${fs}" font-weight="700" fill="${p.ink}">${lines2tspans(lines, c.W / 2, sy, lh, 'middle')}</text>
  ${c.badge ? `<circle cx="${c.W - 130}" cy="${c.H - 230}" r="54" fill="${p.accent}"/><text x="${c.W - 130}" y="${c.H - 214}" text-anchor="middle" font-family="${c.brand.fontHead}" font-size="38" font-weight="700" fill="#fff">${esc(c.badge)}</text>` : ''}
  ${footerBlock(c, p.accent, p.dim, c.H - 140)}`;
}

const TEMPLATES = {
  'dark-fintech': darkFintech, 'soft-pastel': softPastel, 'bold-mag': boldMag,
  'sticky-grid': stickyGrid, 'paper-notes': paperNotes, 'chat-style': chatStyle,
  'newsprint': newsprint, 'clean-minimal': cleanMinimal, 'polaroid': polaroid,
  'warm-photo': warmPhoto, 'playful-shapes': playfulShapes
};

export function renderCard({ W = 1080, H = 1350, text, badge = '', footer = true, brand, seed = '' }) {
  const fn = TEMPLATES[brand.template] || darkFintech;
  const body = fn({ W, H, text, badge, footer, brand, seed });
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// Video-Szenen-Card (9:16) — nutzt Markenfarben/-fonts, vereinfachtes Layout.
export function renderScene({ W = 1080, H = 1920, text, idx, total, brand }) {
  const p = brand.palette;
  const dark = ['dark-fintech', 'warm-photo', 'bold-mag'].includes(brand.template);
  const bg = dark ? p.bg : p.bg, ink = dark ? '#ffffff' : p.ink;
  const lines = wrap(text, 18);
  const fs = lines.length > 4 ? 60 : 74, lh = fs * 1.28;
  const sy = H / 2 - (lines.length - 1) * lh / 2;
  const prog = Math.round((idx + 1) / total * (W - 200));
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${bg}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="${W / 2}" y="180" text-anchor="middle" font-family="${brand.fontHead}" font-size="40" font-weight="700" fill="${p.accent}">${esc(brand.emoji)} ${esc(brand.name)}</text>
  <text x="${W / 2}" y="230" text-anchor="middle" font-family="${brand.fontBody}" font-size="26" fill="${p.dim}">${esc(brand.tagline)}</text>
  <text font-family="${brand.fontHead}" font-size="${fs}" font-weight="800" fill="${ink}">${lines.map((l, i) => `<tspan x="${W / 2}" y="${Math.round(sy + i * lh)}" text-anchor="middle">${esc(l)}</tspan>`).join('')}</text>
  <rect x="100" y="${H - 150}" width="${W - 200}" height="8" rx="4" fill="${p.dim}" opacity="0.35"/>
  <rect x="100" y="${H - 150}" width="${prog}" height="8" rx="4" fill="${p.accent}"/>
</svg>`;
}
