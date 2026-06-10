// generate.mjs — erzeugt aus den Themen postfertigen Content fuer Instagram & Facebook.
// Pro Thema: 3 Hook-Varianten, Reel-Skript, Carousel (Slides), Caption + Hashtags, CTA.
// Output: content/batch-<datum>.json  +  lesbares content/batch-<datum>.md
// Usage: node generate.mjs --count 30
import { readFile, writeFile } from 'node:fs/promises';
import { ask, extractJson } from './lib/claude.mjs';

const count = Number((process.argv.find(a => a.startsWith('--count')) || '').split('=')[1]
  || process.argv[process.argv.indexOf('--count') + 1] || 12);

const BRAND = `Marke: FNF Finanzen. Zielgruppe: junge Eltern in Deutschland.
Produkt: ETF-/Fondssparplan fuers Kind. Ton: warm, klar, auf Augenhoehe, kein Fachchinesisch, kein Verkaufsdruck.
Pflicht: keine Renditeversprechen, Chancen UND Risiken ehrlich, fuehre zum kostenlosen Erstgespraech (Link in Bio / "Kommentar 'START'").
Compliance: keine konkrete Anlageberatung im Post.`;

const SCHEMA = `Antworte NUR als JSON:
{
 "platform_note":"warum dieser Winkel organisch zieht (1 Satz)",
 "hooks":["Hook A (<=12 Woerter)","Hook B","Hook C"],
 "reel":{"laenge_sek":30,"szenen":[{"t":"0-3s","text":"...","visual":"..."}],"voiceover":"durchgehender Sprechtext"},
 "carousel":{"slides":["Slide 1 Titel + Text","Slide 2","...max 7"]},
 "caption":"Instagram/Facebook Caption mit Zeilenumbruechen, endet mit klarer CTA",
 "hashtags":["#...", "max 12, deutsch + nische"],
 "cta":"konkreter Call-to-Action"
}`;

async function makePiece(topic) {
  const out = await ask(
    `${BRAND}\n\nThema/Winkel (${topic.angle}): ${topic.topic}\n\nErstelle EIN Content-Stueck.\n${SCHEMA}`,
    { maxTokens: 1800, temperature: 0.95 }
  );
  return extractJson(out);
}

const topics = JSON.parse(await readFile(new URL('../content/topics.json', import.meta.url), 'utf8'));
const picked = topics.slice(0, count);
const results = [];

for (let i = 0; i < picked.length; i++) {
  const t = picked[i];
  process.stdout.write(`(${i + 1}/${picked.length}) ${t.topic.slice(0, 50)}… `);
  try {
    const piece = await makePiece(t);
    results.push({ topicId: t.id, angle: t.angle, topic: t.topic, ...piece });
    console.log('✓');
  } catch (e) {
    console.log('✗ ' + e.message);
  }
}

const stamp = new Date().toISOString().slice(0, 10);
await writeFile(new URL(`../content/batch-${stamp}.json`, import.meta.url), JSON.stringify(results, null, 2));

// Lesbares Markdown fuer den --review-Workflow / manuelles Posten.
const md = results.map((r, i) => `## ${i + 1}. ${r.topic}  _(${r.angle})_

**Hooks**
${(r.hooks || []).map(h => '- ' + h).join('\n')}

**Reel (${r.reel?.laenge_sek || 30}s)**
${(r.reel?.szenen || []).map(s => `- ${s.t} — ${s.text}  · _${s.visual}_`).join('\n')}
> Voiceover: ${r.reel?.voiceover || ''}

**Carousel**
${(r.carousel?.slides || []).map((s, j) => `${j + 1}. ${s}`).join('\n')}

**Caption**
${r.caption || ''}

**Hashtags:** ${(r.hashtags || []).join(' ')}
**CTA:** ${r.cta || ''}
`).join('\n---\n\n');

await writeFile(new URL(`../content/batch-${stamp}.md`, import.meta.url), `# Content-Batch ${stamp}\n\n${md}`);
console.log(`\n✅ ${results.length} Stuecke -> content/batch-${stamp}.json (+ .md)`);
