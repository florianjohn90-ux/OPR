// higgsfield-fetch.mjs — holt Premium-Assets vollautomatisch von Higgsfield.
// Liest pro Marke media-brief.json (nur inBudget-Items), generiert via CLI
// (`higgsfield generate create ... --wait --json`) und legt Ergebnisse ab als
// content/brands/<id>/media/<bankId>.jpg|mp4 — der Renderer komponiert daraus.
//
// Voraussetzungen (im CI-Workflow erledigt):
//  - `npm i -g @higgsfield/cli`
//  - Secret HIGGSFIELD_CREDENTIALS (Inhalt der credentials.json nach `auth login`)
//    -> Datei schreiben + HIGGSFIELD_CREDENTIALS_PATH setzen
//  - optional: HF_IMAGE_MODEL / HF_VIDEO_MODEL (sonst Auto-Discovery)
//
// Defensive Auslegung: einzelne Fehler stoppen nie den Lauf; ohne Auth wird
// sauber uebersprungen (die Grafik-Pipeline traegt den Content dann allein).
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadBrands, brandDir } from './lib/brands.mjs';

const exec = promisify(execFile);
const MAX_PER_RUN = Number(process.env.HF_MAX_PER_RUN || 40); // Tages-Drossel

async function hf(args, timeout = 600000) {
  const { stdout } = await exec('higgsfield', [...args, '--json', '--no-color'], { timeout, maxBuffer: 20e6 });
  return stdout;
}

// Robust: erste Medien-URL aus beliebiger JSON-/Textantwort ziehen.
function extractUrl(text, kind) {
  const re = kind === 'video'
    ? /https?:\/\/[^\s"']+\.(mp4|mov|webm)[^\s"']*/i
    : /https?:\/\/[^\s"']+\.(jpe?g|png|webp)[^\s"']*/i;
  const m = text.match(re);
  return m ? m[0] : null;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

// ---- Auth pruefen ----
try {
  await hf(['account', 'status'], 30000);
} catch (e) {
  console.log('⏭  Higgsfield nicht authentifiziert — Premium-Assets uebersprungen (Grafik-Fallback aktiv).');
  process.exit(0);
}

// ---- Modelle bestimmen (env-Override > Auto-Discovery) ----
let imageModel = process.env.HF_IMAGE_MODEL || null;
let videoModel = process.env.HF_VIDEO_MODEL || null;
if (!imageModel || !videoModel) {
  try {
    const list = await hf(['model', 'list'], 60000);
    const pick = res => { const m = list.match(res); return m ? m[1] : null; };
    imageModel ||= pick(/"(gpt_image[\w-]*|nano_banana[\w-]*)"/i) || 'nano_banana_2_job';
    videoModel ||= pick(/"(seedance[\w-]*|kling[\w-]*)"/i) || 'seedance_2_0';
  } catch {
    imageModel ||= 'nano_banana_2_job';
    videoModel ||= 'seedance_2_0';
  }
}
console.log(`Modelle: Bild=${imageModel}  Video=${videoModel}`);

const brands = await loadBrands();
let made = 0, failed = 0;

for (const brand of brands) {
  if (made >= MAX_PER_RUN) break;
  const dir = await brandDir(brand.id);
  let brief;
  try { brief = JSON.parse(await readFile(new URL('media-brief.json', dir), 'utf8')); } catch { continue; }
  await mkdir(new URL('media/', dir), { recursive: true });

  for (const item of brief) {
    if (made >= MAX_PER_RUN) break;
    if (!item.inBudget) continue;
    const destPath = new URL(`media/${item.targetFile.split('/').pop()}`, dir).pathname;
    try { await access(destPath); continue; } catch {} // existiert schon

    const isVideo = item.format === 'reel';
    const model = isVideo ? videoModel : imageModel;
    const prompt = isVideo ? item.videoPrompt : item.imagePrompt;
    const args = ['generate', 'create', model, '--prompt', prompt, '--wait',
      '--aspect_ratio', isVideo ? '9:16' : '4:5'];
    if (isVideo) args.push('--duration', '5');

    try {
      const out = await hf(args);
      const url = extractUrl(out, isVideo ? 'video' : 'image');
      if (!url) throw new Error('keine Medien-URL in Antwort');
      await download(url, destPath);
      made++;
      console.log(`✓ [${brand.id}] ${item.bankId} (${isVideo ? 'video' : 'bild'})`);
    } catch (e) {
      failed++;
      console.log(`✗ [${brand.id}] ${item.bankId}: ${String(e.message).slice(0, 140)}`);
    }
  }
}

console.log(`\n✅ Higgsfield: ${made} Assets geholt, ${failed} fehlgeschlagen (Drossel: ${MAX_PER_RUN}/Lauf).`);
