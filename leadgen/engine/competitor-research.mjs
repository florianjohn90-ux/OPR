// competitor-research.mjs — woechentliche Wettbewerber-Analyse via Meta Ad Library.
// Logik: Ads, die LANGE aktiv laufen, funktionieren (sonst wuerde niemand weiterzahlen).
// Deren Hooks/Winkel werden extrahiert und als Inspiration (NICHT als Kopie) in
// content/competitor-insights.json gespeichert — replenish.mjs liest sie ein.
//
// Benoetigt: META_PAGE_TOKEN (Ad-Library-API akzeptiert normale Access Tokens),
//            ANTHROPIC_API_KEY fuer die Muster-Extraktion.
import { readFile, writeFile } from 'node:fs/promises';
import { ask, extractJson } from './lib/claude.mjs';

const V = process.env.META_GRAPH_VERSION || 'v21.0';
const TOKEN = process.env.META_PAGE_TOKEN;
const TERMS = ['Sparplan Kind', 'Junior Depot', 'ETF Kinder', 'Kinderdepot', 'sparen für Kinder'];
const outUrl = new URL('../content/competitor-insights.json', import.meta.url);

async function searchAds(term) {
  const q = new URLSearchParams({
    search_terms: term,
    ad_reached_countries: '["DE"]',
    ad_active_status: 'ACTIVE',
    fields: 'page_name,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time',
    limit: '25',
    access_token: TOKEN
  });
  const res = await fetch(`https://graph.facebook.com/${V}/ads_archive?${q}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

if (!TOKEN) { console.error('META_PAGE_TOKEN fehlt — Recherche uebersprungen.'); process.exit(0); }

// 1) Ads einsammeln und nach Laufzeit ranken.
const all = [];
for (const term of TERMS) {
  try {
    const ads = await searchAds(term);
    all.push(...ads.map(a => ({ term, ...a })));
    console.log(`  "${term}": ${ads.length} aktive Ads`);
  } catch (e) { console.warn(`  "${term}": ${e.message.slice(0, 100)}`); }
}

if (!all.length) {
  console.log('Keine Ads gefunden — bestehende Insights bleiben erhalten.');
  process.exit(0);
}

const ranked = all
  .filter(a => a.ad_creative_bodies?.length)
  .map(a => ({
    page: a.page_name,
    runningDays: Math.round((Date.now() - new Date(a.ad_delivery_start_time)) / 86400000),
    body: a.ad_creative_bodies[0].slice(0, 500)
  }))
  .sort((a, b) => b.runningDays - a.runningDays)
  .slice(0, 30);

// 2) Claude extrahiert Muster — Inspiration, keine Kopien.
const analysis = await ask(
  `Hier sind ${ranked.length} aktive deutsche Meta-Ads zum Thema Kindersparplan/Junior-Depot,
sortiert nach Laufzeit (lange Laufzeit = funktioniert vermutlich):

${ranked.map((r, i) => `${i + 1}. [${r.page}, laeuft ${r.runningDays} Tage] ${r.body}`).join('\n\n')}

Analysiere fuer organischen Content (NICHT kopieren, sondern Muster lernen):
Antworte NUR als JSON:
{"hooks_die_funktionieren":["Muster 1","..."],
 "winkel_die_funktionieren":["..."],
 "emotionale_trigger":["..."],
 "luecken_die_keiner_bedient":["Winkel, die KEIN Wettbewerber nutzt"],
 "konkrete_content_ideen":[{"angle":"...","topic":"konkrete Idee fuer FNF Finanzen"}]}`,
  { maxTokens: 2500, temperature: 0.7 }
);

const insights = extractJson(analysis);
insights.generatedAt = new Date().toISOString();
insights.adsAnalyzed = ranked.length;
insights.topAds = ranked.slice(0, 10);

await writeFile(outUrl, JSON.stringify(insights, null, 2));
console.log(`\n✅ ${ranked.length} Ads analysiert -> content/competitor-insights.json`);
console.log('Top-Luecken:', (insights.luecken_die_keiner_bedient || []).slice(0, 3).join(' | '));
