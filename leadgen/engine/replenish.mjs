// replenish.mjs — haelt die Content-Bank automatisch gefuellt (Autopilot-Nachschub).
// Wenn weniger als MIN_SCHEDULED Posts geplant sind, generiert Claude neue Bank-Eintraege
// (gleiches Schema wie bank.json), haengt sie an und vermeidet Themen-Dopplungen.
// Danach im Workflow: calendar.mjs + render-image.mjs ausfuehren.
import { readFile, writeFile } from 'node:fs/promises';
import { ask, extractJson } from './lib/claude.mjs';

const MIN_SCHEDULED = 14;   // < 1 Woche Vorrat -> nachfuellen
const BATCH = 12;

const dir = new URL('../content/', import.meta.url);
const bank = JSON.parse(await readFile(new URL('bank.json', dir), 'utf8'));
let calendar = [];
try { calendar = JSON.parse(await readFile(new URL('calendar.json', dir), 'utf8')); } catch {}

const scheduled = calendar.filter(p => p.status === 'scheduled').length;
if (scheduled >= MIN_SCHEDULED) {
  console.log(`Vorrat ok (${scheduled} geplant) — kein Nachschub noetig.`);
  process.exit(0);
}

console.log(`Nur ${scheduled} Posts geplant — generiere ${BATCH} neue…`);

const out = await ask(
  `Du bist Social-Media-Texter fuer "FNF Finanzen" (deutscher Finanzberater).
Zielgruppe: junge Eltern. Produkt: ETF-/Fondssparplan fuers Kind.
Ton: warm, klar, auf Augenhoehe, kein Fachchinesisch, kein Verkaufsdruck.
Pflicht: KEINE Renditeversprechen, Risiken ehrlich benennen (Schwankungen, Verlust moeglich),
jede Caption endet mit CTA zum kostenlosen Erstgespraech ("Link in Bio").

Erstelle ${BATCH} NEUE Posts. Vermeide Dopplungen zu diesen Themen:
${bank.map(b => b.topic).join('; ')}

Antworte NUR als JSON-Array, exakt dieses Schema:
[{"id":"px","angle":"schmerz|aha|frage|einwand|story|how-to|vergleich|mythos|emotion|saison",
  "topic":"...","format":"image",
  "hooks":["Hook A (max 12 Woerter)","Hook B"],
  "caption":"Caption mit \\n Zeilenumbruechen, endet mit CTA",
  "hashtags":["#...","genau 8 Stueck, deutsch"]}]`,
  { maxTokens: 4000, temperature: 0.95 }
);

const fresh = extractJson(out);
if (!Array.isArray(fresh) || !fresh.length) throw new Error('Keine validen Posts generiert');

// IDs eindeutig machen.
const maxN = bank.reduce((m, b) => Math.max(m, Number((b.id || '').replace(/\D/g, '') || 0)), 0);
fresh.forEach((p, i) => { p.id = 'p' + String(maxN + i + 1).padStart(2, '0'); p.format = 'image'; });

await writeFile(new URL('bank.json', dir), JSON.stringify([...bank, ...fresh], null, 2));
console.log(`✅ ${fresh.length} neue Posts in bank.json (gesamt ${bank.length + fresh.length}).`);
