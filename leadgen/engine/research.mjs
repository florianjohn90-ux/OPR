// research.mjs — findet Content-Themen fuer junge Eltern (ETF-Sparplan fuers Kind).
// Quelle 1: kuratierte Seed-Bank (evergreen Schmerzpunkte/Fragen, sofort nutzbar).
// Quelle 2 (optional): Claude erweitert die Themenliste mit aktuellen Winkeln.
// Output: content/topics.json
import { writeFile, mkdir } from 'node:fs/promises';
import { ask, extractJson } from './lib/claude.mjs';

// Evergreen-Seed-Bank: Aengste, Fragen und Aha-Momente der Zielgruppe.
const SEEDS = [
  { angle: 'schmerz',   topic: 'Wie viel Geld dem Kind durch Warten jedes Jahr verloren geht (Zinseszins)' },
  { angle: 'schmerz',   topic: 'Sparbuch fuers Kind frisst die Inflation auf – was Eltern stattdessen tun' },
  { angle: 'frage',     topic: 'ETF-Sparplan aufs Kind oder auf die Eltern – was ist sinnvoller?' },
  { angle: 'frage',     topic: 'Ab welchem Betrag lohnt sich ein Sparplan fuers Kind?' },
  { angle: 'frage',     topic: 'Was passiert mit dem Geld, wenn das Kind 18 wird?' },
  { angle: 'aha',       topic: '25 Euro/Monat ab Geburt – was am 18. Geburtstag daraus wird' },
  { angle: 'aha',       topic: 'Die 3 groessten Fehler beim Sparen fuers Kind' },
  { angle: 'aha',       topic: 'Warum der Startzeitpunkt wichtiger ist als die Sparrate' },
  { angle: 'einwand',   topic: 'ETFs sind doch riskant? – Risiko ueber lange Zeitraeume erklaert' },
  { angle: 'einwand',   topic: 'Ich habe doch kaum Geld uebrig – wie kleine Betraege trotzdem wirken' },
  { angle: 'story',     topic: 'Frischgebackene Eltern: der erste finanzielle Schritt nach der Geburt' },
  { angle: 'story',     topic: 'Oma & Opa wollen sparen – wie man Geschenke sinnvoll buendelt' },
  { angle: 'how-to',    topic: 'In 3 Schritten zum ersten Sparplan fuers Kind' },
  { angle: 'how-to',    topic: 'Checkliste: das brauchst du, um heute zu starten' },
  { angle: 'vergleich', topic: 'Sparbuch vs. Tagesgeld vs. ETF-Sparplan fuers Kind' },
  { angle: 'mythos',    topic: 'Mythos: Aktien sind Gluecksspiel – Fakten fuer Eltern' },
  { angle: 'saison',    topic: 'Steuer-/Freibetrag-Winkel: Geld aufs Kind und Freibetraege' },
  { angle: 'emotion',   topic: 'Was du deinem Kind mit 18 schenken willst – und wie du es heute baust' }
];

async function expand() {
  try {
    const out = await ask(
      `Du bist Content-Stratege fuer einen deutschen Finanzberater (Zielgruppe: junge Eltern, Thema ETF-Sparplan fuers Kind).
Erweitere die Themenliste um 15 zusaetzliche, frische und neugierig machende Content-Winkel fuer Instagram/Facebook Reels & Carousels.
Vermeide Dopplungen zu: ${SEEDS.map(s => s.topic).join('; ')}.
Antworte NUR als JSON-Array: [{"angle":"...","topic":"..."}]. angle ist eines von: schmerz, frage, aha, einwand, story, how-to, vergleich, mythos, saison, emotion.`,
      { maxTokens: 1500, temperature: 1.0 }
    );
    const extra = extractJson(out);
    return Array.isArray(extra) ? extra : [];
  } catch (e) {
    console.warn('⚠️  Themen-Erweiterung uebersprungen (' + e.message + '). Nutze nur Seed-Bank.');
    return [];
  }
}

const all = [...SEEDS, ...(process.env.ANTHROPIC_API_KEY ? await expand() : [])]
  .map((t, i) => ({ id: 't' + (i + 1), ...t }));

await mkdir(new URL('../content/', import.meta.url), { recursive: true });
await writeFile(new URL('../content/topics.json', import.meta.url), JSON.stringify(all, null, 2));
console.log(`✅ ${all.length} Themen gespeichert -> content/topics.json`);
