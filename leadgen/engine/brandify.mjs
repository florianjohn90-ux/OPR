// brandify.mjs — verwandelt die zentrale Content-Bank in 10 markeneigene Kalender.
// Pro Marke wird jeder Post von Claude NEU GESCHRIEBEN (Stimme, Nische, Fokus der
// Marke) — kein Copy-Paste-Netzwerk, jede Marke klingt wie ein eigener Mensch.
// Ohne ANTHROPIC_API_KEY: Fallback auf Originaltexte (Pipeline bleibt lauffaehig).
//
// Output: content/brands/<id>/calendar.json   (idempotent, haengt nur Neues an)
import { readFile, writeFile } from 'node:fs/promises';
import { ask, extractJson } from './lib/claude.mjs';
import { loadBrands, brandDir } from './lib/brands.mjs';

const bank = JSON.parse(await readFile(new URL('../content/bank.json', import.meta.url), 'utf8'));
const brands = await loadBrands();
const HAS_API = !!process.env.ANTHROPIC_API_KEY;

// Posting-Slots pro Marke leicht versetzt (wirkt organisch, vermeidet API-Bursts).
function slotsFor(brandIdx) {
  const shift = m => { const t = 600 + brandIdx * 7 + m; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  return { instagram: [shift(0), shift(450)], facebook: [shift(-150), shift(390)] };
}

async function rewrite(piece, brand) {
  if (!HAS_API) return null;
  const out = await ask(
    `Du schreibst fuer die Social-Media-Marke "${brand.name}" (${brand.handle}).
Nische: ${brand.niche}
Zielgruppe: ${brand.audience}
Stimme: ${brand.voice}
Beispielsatz der Marke: "${brand.voiceSample}"
CTA der Marke: "${brand.cta}"

Schreibe diesen Post KOMPLETT NEU in der Stimme und mit dem Nischen-Fokus dieser Marke.
Gleiche Kernbotschaft, aber eigene Worte, eigener Einstieg, eigene Beispiele — es darf
nicht erkennbar derselbe Text sein. Risiken ehrlich benennen, keine Renditeversprechen.

Original:
Hook: ${piece.hooks[0]}
Caption: ${piece.caption}
${piece.slides ? 'Slides: ' + JSON.stringify(piece.slides) : ''}
${piece.items ? 'Listen-Punkte: ' + JSON.stringify(piece.items) + '\nHeadline: ' + piece.headline : ''}
${piece.script ? 'Reel-Voiceover: ' + piece.script.voiceover + '\nSzenen: ' + JSON.stringify(piece.script.scenes) : ''}

Antworte NUR als JSON:
{"hook":"...","caption":"...","hashtags":["8 passende, zur Marke/Nische, deutsch"]${piece.slides ? ',"slides":["gleiche Anzahl Slides, neu getextet"]' : ''}${piece.items ? ',"headline":"KURZE VERSALIEN-HEADLINE","items":[{"emoji":"...","title":"...","text":"max 90 Zeichen"}]' : ''}${piece.script ? ',"script":{"voiceover":"...","scenes":[{"text":"...","dur":N}]}' : ''}}`,
    { maxTokens: 2500, temperature: 0.95 }
  );
  return extractJson(out);
}

for (let bi = 0; bi < brands.length; bi++) {
  const brand = brands[bi];
  const dir = await brandDir(brand.id);
  const calUrl = new URL('calendar.json', dir);
  let cal = [];
  try { cal = JSON.parse(await readFile(calUrl, 'utf8')); } catch {}
  const have = new Set(cal.map(p => p.bankId + '|' + p.platform));

  const slots = slotsFor(bi);
  const lastDate = cal.reduce((m, p) => Math.max(m, new Date(p.scheduledFor).getTime()), Date.now());
  let cursor = new Date(lastDate);
  let slotIdx = 0, added = 0;

  for (const piece of bank) {
    // Pro Marke neu texten — einmal pro Bank-Post, dann fuer beide Plattformen nutzen.
    let v = null, tried = false;
    for (const platform of ['instagram', 'facebook']) {
      if (have.has(piece.id + '|' + platform)) continue;
      if (!tried) {
        tried = true;
        try { v = await rewrite(piece, brand); } catch (e) { console.warn(`  ${brand.id}/${piece.id}: ${e.message.slice(0, 80)} -> Original`); }
      }
      const time = slots[platform][slotIdx % 2];
      if (slotIdx % 4 === 0) cursor = new Date(cursor.getTime() + 86400000);
      const iso = cursor.toISOString().slice(0, 10);
      cal.push({
        id: `${brand.id}-${piece.id}-${platform}`,
        bankId: piece.id, brandId: brand.id,
        scheduledFor: `${iso}T${time}:00Z`, platform,
        format: piece.format || 'image', goal: piece.goal || 'conversion',
        topic: piece.topic, angle: piece.angle,
        hook: v?.hook || piece.hooks[0],
        caption: v?.caption || piece.caption,
        hashtags: v?.hashtags || piece.hashtags,
        ...(piece.slides ? { slides: v?.slides?.length === piece.slides.length ? v.slides : piece.slides } : {}),
        ...(piece.items ? { headline: v?.headline || piece.headline, items: v?.items?.length ? v.items : piece.items } : {}),
        ...(piece.script ? { script: v?.script?.scenes?.length ? v.script : piece.script } : {}),
        rewritten: !!v,
        status: 'scheduled'
      });
      added++; slotIdx++;
    }
  }

  cal.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  await writeFile(calUrl, JSON.stringify(cal, null, 2));
  console.log(`✅ ${brand.name}: +${added} Posts (${HAS_API ? 'markenspezifisch getextet' : 'Originaltexte, kein API-Key'}) — gesamt ${cal.length}`);
}
