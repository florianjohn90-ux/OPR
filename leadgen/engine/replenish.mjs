// replenish.mjs — haelt die Content-Bank automatisch gefuellt (Autopilot-Nachschub).
// Mix pro Batch: Formate (Reels/Carousels/Images) und Saeulen (Conversion/Trust/
// Engagement). Nutzt Wettbewerber-Insights (competitor-insights.json), falls vorhanden.
import { readFile, writeFile } from 'node:fs/promises';
import { ask, extractJson } from './lib/claude.mjs';

const MIN_SCHEDULED = 14;   // < 1 Woche Vorrat -> nachfuellen
const BATCH = 12;

const dir = new URL('../content/', import.meta.url);
const bank = JSON.parse(await readFile(new URL('bank.json', dir), 'utf8'));
let calendar = [];
try { calendar = JSON.parse(await readFile(new URL('calendar.json', dir), 'utf8')); } catch {}
let insights = null;
try { insights = JSON.parse(await readFile(new URL('competitor-insights.json', dir), 'utf8')); } catch {}

const scheduled = calendar.filter(p => p.status === 'scheduled').length;
if (scheduled >= MIN_SCHEDULED) {
  console.log(`Vorrat ok (${scheduled} geplant) — kein Nachschub noetig.`);
  process.exit(0);
}

console.log(`Nur ${scheduled} Posts geplant — generiere ${BATCH} neue…`);

const insightBlock = insights ? `
WETTBEWERBER-INSIGHTS (zur Inspiration — Muster uebernehmen, NIEMALS Texte kopieren):
- Funktionierende Hooks: ${(insights.hooks_die_funktionieren || []).join('; ')}
- Funktionierende Winkel: ${(insights.winkel_die_funktionieren || []).join('; ')}
- Emotionale Trigger: ${(insights.emotionale_trigger || []).join('; ')}
- UNBEDIENTE LUECKEN (bevorzugt nutzen!): ${(insights.luecken_die_keiner_bedient || []).join('; ')}
- Konkrete Ideen: ${(insights.konkrete_content_ideen || []).map(i => i.topic).join('; ')}
` : '';

const out = await ask(
  `Du bist Social-Media-Stratege fuer "FNF Finanzen" (Florian, deutscher Finanzberater).
Zielgruppe: junge Eltern. Produkt: ETF-/Fondssparplan fuers Kind.
Ton: warm, klar, auf Augenhoehe, kein Fachchinesisch, kein Verkaufsdruck. Du-Form.
Pflicht: KEINE Renditeversprechen, Risiken ehrlich benennen (Schwankungen, Verlust moeglich).
${insightBlock}
Erstelle ${BATCH} NEUE Posts. Vermeide Dopplungen zu: ${bank.map(b => b.topic).join('; ')}

PFLICHT-MIX:
- Formate: 4x "reel" (mit script), 4x "carousel" (mit slides, 5-7 Stueck), 4x "image"
- Saeulen ("goal"): 6x "conversion" (CTA Erstgespraech), 4x "trust" (persoenlich,
  hinter den Kulissen, ehrliche Einblicke — CTA optional/weich), 2x "engagement"
  (Community-Frage mit A/B/C/D-Antwortoptionen in der Caption, KEIN Verkaufs-CTA)

Antworte NUR als JSON-Array, exakt dieses Schema (Felder je nach Format):
[{"id":"px","angle":"schmerz|aha|frage|einwand|story|how-to|vergleich|mythos|emotion|saison",
  "topic":"...","format":"image|carousel|reel","goal":"conversion|trust|engagement",
  "hooks":["Hook A (max 12 Woerter)","Hook B"],
  "caption":"Caption mit \\n Zeilenumbruechen",
  "hashtags":["#...","genau 8 Stueck, deutsch"],
  "slides":["nur bei carousel: 5-7 Slide-Texte, Slide 1 = Hook, letzte = CTA"],
  "script":{"voiceover":"nur bei reel: 80-120 Woerter Sprechtext, endet mit Risikohinweis+CTA",
            "scenes":[{"text":"On-Screen-Text (max 12 Woerter)","dur":4}]}}]`,
  { maxTokens: 8000, temperature: 0.95 }
);

const fresh = extractJson(out);
if (!Array.isArray(fresh) || !fresh.length) throw new Error('Keine validen Posts generiert');

// IDs eindeutig machen.
const maxN = bank.reduce((m, b) => Math.max(m, Number((b.id || '').replace(/\D/g, '') || 0)), 0);
fresh.forEach((p, i) => { p.id = 'g' + String(maxN + i + 1).padStart(3, '0'); });

await writeFile(new URL('bank.json', dir), JSON.stringify([...bank, ...fresh], null, 2));
console.log(`✅ ${fresh.length} neue Posts in bank.json (gesamt ${bank.length + fresh.length}).`);
console.log('Formate:', fresh.map(p => p.format).join(', '));
