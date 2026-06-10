// calendar.mjs — verteilt die Content-Bank (content/bank.json) auf einen Posting-Plan.
// Jeder Bank-Post wird je Plattform (FB + IG) eingeplant; 2 Posts/Tag/Plattform.
// Bereits geplante/gepostete Eintraege bleiben erhalten (idempotent, Autopilot-faehig).
// Output: content/calendar.json
import { readFile, writeFile } from 'node:fs/promises';

const dir = new URL('../content/', import.meta.url);
const bank = JSON.parse(await readFile(new URL('bank.json', dir), 'utf8'));

let existing = [];
try { existing = JSON.parse(await readFile(new URL('calendar.json', dir), 'utf8')); } catch {}
const already = new Set(existing.map(p => p.id));

// Sende-Slots (UTC, Cron-kompatibel) — Eltern-Fenster morgens/abends.
const SLOTS = { instagram: ['10:00', '17:30'], facebook: ['07:30', '16:30'] };
const PLATFORMS = ['instagram', 'facebook'];

const fresh = [];
for (const piece of bank) {
  for (const platform of PLATFORMS) {
    const id = `${piece.id}-${platform}`;
    if (already.has(id)) continue;
    fresh.push({ id, platform, piece });
  }
}

// Letzten geplanten Tag finden, dahinter anhaengen.
const lastDate = existing.reduce((m, p) => Math.max(m, new Date(p.scheduledFor).getTime()), Date.now());
let cursor = new Date(lastDate);

const plan = [...existing];
let slotIdx = 0;
for (const { id, platform, piece } of fresh) {
  const time = SLOTS[platform][slotIdx % 2];
  if (slotIdx % (PLATFORMS.length * 2) === 0) cursor = new Date(cursor.getTime() + 86400000);
  const iso = cursor.toISOString().slice(0, 10);
  plan.push({
    id, scheduledFor: `${iso}T${time}:00Z`, platform,
    format: piece.format || 'image',
    goal: piece.goal || 'conversion',
    topic: piece.topic, angle: piece.angle,
    hook: piece.hooks[0],
    caption: piece.caption,
    hashtags: piece.hashtags,
    ...(piece.slides ? { slides: piece.slides } : {}),
    ...(piece.script ? { script: piece.script } : {}),
    status: 'scheduled'
  });
  slotIdx++;
}

plan.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
await writeFile(new URL('calendar.json', dir), JSON.stringify(plan, null, 2));
console.log(`✅ Kalender: ${plan.length} Posts gesamt, ${fresh.length} neu geplant -> content/calendar.json`);
