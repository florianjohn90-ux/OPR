// render-video.mjs — produziert Reels fuer ALLE Marken im Marken-Design (1080x1920 MP4).
// Szenen-Cards (sharp) + Voiceover (edge-tts, Stimme pro Marke variiert) + ffmpeg.
// Rollierendes Fenster RENDER_DAYS. Fallback: ohne TTS wird stumm gebaut.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { renderScene, photoOverlay, renderList } from './lib/templates.mjs';
import { loadBrands, brandDir } from './lib/brands.mjs';
import { access, readdir } from 'node:fs/promises';

// Hintergrundmusik fuer Listicle-Reels: lizenzfreie Tracks in content/music/
// (rotiert deterministisch pro Post). Fallback: generierter Ambient-Pad.
const musicDir = new URL('../content/music/', import.meta.url);
async function pickMusic(seed) {
  try {
    const files = (await readdir(musicDir)).filter(f => /\.(mp3|m4a|wav)$/i.test(f)).sort();
    if (!files.length) return null;
    let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return new URL(files[h % files.length], musicDir).pathname;
  } catch { return null; }
}

const exec = promisify(execFile);
const RENDER_DAYS = Number(process.env.RENDER_DAYS || 7);
const horizon = Date.now() + RENDER_DAYS * 86400000;

// Unterschiedliche deutsche Stimmen pro Marke — klingt nach Menschen, nicht nach Netzwerk.
const VOICES = ['de-DE-SeraphinaMultilingualNeural', 'de-DE-KatjaNeural', 'de-DE-ConradNeural',
  'de-DE-AmalaNeural', 'de-DE-FlorianMultilingualNeural', 'de-DE-KillianNeural'];

const brands = await loadBrands();
const tmpDir = new URL('../content/.tmp-video/', import.meta.url);

async function tts(text, voice, outFile) {
  try {
    await exec('edge-tts', ['--voice', voice, '--rate', '+8%', '--text', text, '--write-media', outFile], { timeout: 120000 });
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
    const dur = parseFloat(stdout.trim());
    if (!dur || dur < 1) throw new Error('leer');
    return dur;
  } catch (e) {
    console.warn('  ⚠️ TTS nicht verfuegbar — Reel wird stumm gebaut.');
    return null;
  }
}

let total = 0;
for (let bi = 0; bi < brands.length; bi++) {
  const brand = brands[bi];
  const voice = VOICES[bi % VOICES.length];
  const dir = await brandDir(brand.id);
  const calUrl = new URL('calendar.json', dir);
  let plan;
  try { plan = JSON.parse(await readFile(calUrl, 'utf8')); } catch { continue; }

  const reels = plan.filter(p => p.status === 'scheduled' && p.format === 'reel' && p.script
    && !p.assetPath && new Date(p.scheduledFor).getTime() <= horizon);

  // ---- Listicle-Reels: statisches Bild + Musik (massives Watchtime-Signal) ----
  const lists = plan.filter(p => p.status === 'scheduled' && p.format === 'list'
    && Array.isArray(p.items) && !p.assetPath && new Date(p.scheduledFor).getTime() <= horizon);
  for (const post of lists) {
    console.log(`📋 [${brand.id}] ${post.id} (Listicle-Reel)`);
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });

    // Listicle-Card (4:5) mittig auf 9:16-Flaeche in Markenfarbe.
    const card = await sharp(Buffer.from(renderList({
      headline: post.headline || post.hook, items: post.items, brand, seed: post.id
    }))).png().toBuffer();
    const still = new URL('still.png', tmpDir).pathname;
    await sharp({ create: { width: 1080, height: 1920, channels: 3, background: brand.palette.bg } })
      .composite([{ input: card, top: 285, left: 0 }]).png().toFile(still);

    // Lesedauer: Grundzeit + ~3,5 s pro Punkt (gern 2x lesbar -> Loop-Replays).
    const dur = Math.min(35, 8 + post.items.length * 3.5);
    const music = await pickMusic(post.id);
    const outFile = `${post.bankId || post.id}-${post.platform}.mp4`;
    const outPath = new URL('assets/' + outFile, dir).pathname;

    const args = ['-y', '-loop', '1', '-i', still];
    if (music) args.push('-stream_loop', '-1', '-i', music);
    else args.push('-f', 'lavfi', '-i',
      `aevalsrc=0.16*sin(220*2*PI*t)+0.12*sin(277.18*2*PI*t)+0.10*sin(329.63*2*PI*t)+0.05*sin(110*2*PI*t):s=44100,tremolo=f=0.18:d=0.55,lowpass=f=950`);
    args.push('-t', String(dur),
      // Subtiler Push-in haelt das Auge im Bild, ohne die Lesbarkeit zu stoeren.
      '-vf', `scale=2160:3840,zoompan=z='1+0.00035*on':d=${dur * 30}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,format=yuv420p`,
      '-af', `volume=0.55,afade=t=in:d=1,afade=t=out:st=${dur - 1.5}:d=1.5`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-c:a', 'aac', '-b:a', '128k', '-shortest', outPath);
    await exec('ffmpeg', args, { timeout: 600000 });

    post.assetPath = `content/brands/${brand.id}/assets/${outFile}`;
    post.music = music ? music.split('/').pop() : 'ambient-fallback';
    total++;
  }

  for (const post of reels) {
    console.log(`🎬 [${brand.id}] ${post.id}`);
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
    const scenes = post.script.scenes;
    const planned = scenes.reduce((s, x) => s + (x.dur || 4), 0);

    const voPath = new URL('vo.mp3', tmpDir).pathname;
    const voDur = post.script.voiceover ? await tts(post.script.voiceover, voice, voPath) : null;
    const scale = voDur ? voDur / planned : 1;

    // Premium-Pfad: Higgsfield-B-Roll (media/<bankId>.mp4) + Voiceover + Marken-Overlay.
    let broll = null;
    try { broll = new URL(`media/${post.bankId}.mp4`, dir).pathname; await access(broll); } catch { broll = null; }
    if (broll && voDur) {
      const overlayPng = new URL('overlay.png', tmpDir).pathname;
      await sharp(Buffer.from(photoOverlay({ W: 1080, H: 1920, text: post.hook, brand, footer: true })))
        .png().toFile(overlayPng);
      const outFile = `${post.bankId || post.id}-${post.platform}.mp4`;
      await exec('ffmpeg', ['-y', '-stream_loop', '-1', '-i', broll, '-i', overlayPng, '-i', voPath,
        '-filter_complex', '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg];[bg][1:v]overlay=0:0[v]',
        '-map', '[v]', '-map', '2:a', '-t', String(voDur.toFixed(2)),
        '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-c:a', 'aac', '-b:a', '128k',
        new URL('assets/' + outFile, dir).pathname], { timeout: 600000 });
      post.assetPath = `content/brands/${brand.id}/assets/${outFile}`;
      post.hasVoiceover = true; post.usedMedia = true;
      total++;
      continue;
    }

    let concat = '';
    for (let i = 0; i < scenes.length; i++) {
      const png = new URL(`s${i}.png`, tmpDir).pathname;
      await sharp(Buffer.from(renderScene({ text: scenes[i].text, idx: i, total: scenes.length, brand }))).png().toFile(png);
      concat += `file '${png}'\nduration ${((scenes[i].dur || 4) * scale).toFixed(2)}\n`;
    }
    concat += `file '${new URL(`s${scenes.length - 1}.png`, tmpDir).pathname}'\n`;
    const listPath = new URL('list.txt', tmpDir).pathname;
    await writeFile(listPath, concat);

    const outFile = `${post.bankId || post.id}-${post.platform}.mp4`;
    const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath];
    if (voDur) args.push('-i', voPath);
    args.push('-vf', 'scale=1080:1920,format=yuv420p,fade=t=in:d=0.5', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21');
    if (voDur) args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
    args.push(new URL('assets/' + outFile, dir).pathname);
    await exec('ffmpeg', args, { timeout: 600000 });

    post.assetPath = `content/brands/${brand.id}/assets/${outFile}`;
    post.hasVoiceover = !!voDur;
    total++;
  }
  await writeFile(calUrl, JSON.stringify(plan, null, 2));
}
await rm(tmpDir, { recursive: true, force: true });
console.log(`✅ ${total} Reels gerendert (${brands.length} Marken).`);
