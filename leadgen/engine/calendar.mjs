// calendar.mjs — verteilt den neuesten Content-Batch auf einen 30-Tage-Posting-Plan.
// Reels-first (hoechste organische Reichweite), Carousels fuer Tiefe, je Plattform.
// Output: content/calendar.json
import { readdir, readFile, writeFile } from 'node:fs/promises';

const dir = new URL('../content/', import.meta.url);
const files = (await readdir(dir)).filter(f => /^batch-.*\.json$/.test(f)).sort();
if (!files.length) { console.error('Kein batch-*.json gefunden. Erst: node generate.mjs'); process.exit(1); }
const batch = JSON.parse(await readFile(new URL(files.at(-1), dir), 'utf8'));

// Sende-Slots (lokale Zeit) — bewaehrte Fenster fuer Eltern: morgens, mittags, abends.
const SLOTS = {
  instagram: ['11:30', '19:30'],   // Reel + Carousel/Story
  facebook:  ['08:30', '18:30']
};
const PLATFORMS = ['instagram', 'facebook'];

const plan = [];
let day = 0, idx = 0;
while (idx < batch.length && day < 30) {
  const date = new Date(); date.setDate(date.getDate() + day);
  const iso = date.toISOString().slice(0, 10);
  for (const platform of PLATFORMS) {
    for (const time of SLOTS[platform]) {
      if (idx >= batch.length) break;
      const piece = batch[idx++];
      // Slot 1 = Reel, Slot 2 = Carousel — alterniert.
      const format = time === SLOTS[platform][0] ? 'reel' : 'carousel';
      plan.push({
        scheduledFor: `${iso}T${time}:00`,
        platform, format,
        topicId: piece.topicId,
        topic: piece.topic,
        hook: (piece.hooks && piece.hooks[0]) || piece.topic,
        caption: piece.caption,
        hashtags: piece.hashtags,
        body: format === 'reel' ? piece.reel : piece.carousel,
        cta: piece.cta,
        status: 'scheduled'
      });
    }
  }
  day++;
}

await writeFile(new URL('calendar.json', dir), JSON.stringify(plan, null, 2));
console.log(`✅ ${plan.length} Posts ueber ${Math.min(day, 30)} Tage geplant -> content/calendar.json`);
