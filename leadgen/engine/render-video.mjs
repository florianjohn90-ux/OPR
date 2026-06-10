// render-video.mjs — produziert fertige Reels (1080x1920 MP4) vollautomatisch:
//   1. Szenen-Cards aus dem Skript rendern (sharp)
//   2. Voiceover via edge-tts (kostenlose deutsche Neural-Stimme)
//   3. Montage mit ffmpeg: Szenen-Timing, sanfter Zoom, Voiceover-Tonspur
// Fallback: schlaegt TTS fehl (z.B. offline), wird das Reel stumm gebaut.
// Voraussetzungen: ffmpeg im PATH, `pip install edge-tts` (in CI vorhanden).
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const exec = promisify(execFile);
const W = 1080, H = 1920;
const VOICE = process.env.TTS_VOICE || 'de-DE-SeraphinaMultilingualNeural';

const calUrl = new URL('../content/calendar.json', import.meta.url);
const assetsDir = new URL('../content/assets/', import.meta.url);
const tmpDir = new URL('../content/.tmp-video/', import.meta.url);
await mkdir(assetsDir, { recursive: true });

const plan = JSON.parse(await readFile(calUrl, 'utf8'));
const reels = plan.filter(p => p.format === 'reel' && p.script && !p.assetPath);
if (!reels.length) { console.log('Keine neuen Reels zu rendern.'); process.exit(0); }

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

function sceneSvg(text, idx, total) {
  const lines = wrap(text, 20);
  const fontSize = lines.length > 4 ? 64 : 78;
  const lineH = fontSize * 1.28;
  const startY = H / 2 - (lines.length - 1) * lineH / 2;
  const tspans = lines.map((l, i) => `<tspan x="${W / 2}" y="${Math.round(startY + i * lineH)}">${esc(l)}</tspan>`).join('');
  const prog = Math.round((idx + 1) / total * (W - 160));
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1b2c4e"/><stop offset="1" stop-color="#0e1726"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="${W / 2}" y="170" text-anchor="middle" font-family="Arial" font-size="38" font-weight="700" fill="#eaf1ff">FNF Finanzen</text>
  <text x="${W / 2}" y="218" text-anchor="middle" font-family="Arial" font-size="27" fill="#9fb2d6">Sparen für dein Kind, einfach erklärt</text>
  <text text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff">${tspans}</text>
  <rect x="80" y="${H - 140}" width="${W - 160}" height="8" rx="4" fill="#24365c"/>
  <rect x="80" y="${H - 140}" width="${prog}" height="8" rx="4" fill="#36c08a"/>
</svg>`;
}

async function tts(text, outFile) {
  try {
    await exec('edge-tts', ['--voice', VOICE, '--rate', '+8%', '--text', text, '--write-media', outFile], { timeout: 120000 });
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
    const dur = parseFloat(stdout.trim());
    if (!dur || dur < 1) throw new Error('TTS-Datei leer');
    return dur;
  } catch (e) {
    console.warn('  ⚠️ TTS nicht verfuegbar (' + e.message.slice(0, 80) + ') — Reel wird stumm gebaut.');
    return null;
  }
}

for (const post of reels) {
  console.log(`🎬 ${post.id} — ${post.topic}`);
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });
  const scenes = post.script.scenes;
  const planned = scenes.reduce((s, x) => s + (x.dur || 4), 0);

  // 1) Voiceover zuerst — Szenen werden auf die echte Audiolaenge skaliert.
  const voPath = new URL('vo.mp3', tmpDir).pathname;
  const voDur = post.script.voiceover ? await tts(post.script.voiceover, voPath) : null;
  const scale = voDur ? voDur / planned : 1;

  // 2) Szenen-Cards rendern + ffmpeg-concat-Liste schreiben.
  let concat = '';
  for (let i = 0; i < scenes.length; i++) {
    const png = new URL(`s${i}.png`, tmpDir).pathname;
    await sharp(Buffer.from(sceneSvg(scenes[i].text, i, scenes.length))).png().toFile(png);
    concat += `file '${png}'\nduration ${((scenes[i].dur || 4) * scale).toFixed(2)}\n`;
  }
  concat += `file '${new URL(`s${scenes.length - 1}.png`, tmpDir).pathname}'\n`;
  const listPath = new URL('list.txt', tmpDir).pathname;
  await writeFile(listPath, concat);

  // 3) Montage.
  const outFile = `${post.id}.mp4`;
  const outPath = new URL(outFile, assetsDir).pathname;
  const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath];
  if (voDur) args.push('-i', voPath);
  args.push('-vf', `scale=${W}:${H},format=yuv420p,fade=t=in:d=0.5`,
    '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21');
  if (voDur) args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  args.push(outPath);
  await exec('ffmpeg', args, { timeout: 600000 });

  post.assetPath = `content/assets/${outFile}`;
  post.hasVoiceover = !!voDur;
  console.log(`  ✓ ${outFile} (${voDur ? 'mit' : 'OHNE'} Voiceover)`);
}

await rm(tmpDir, { recursive: true, force: true });
await writeFile(calUrl, JSON.stringify(plan, null, 2));
console.log(`\n✅ ${reels.length} Reels gerendert -> content/assets/`);
