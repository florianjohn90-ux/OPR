// report.mjs — baut den taeglichen Status-Report (Markdown) aus stats-history.
// Der Workflow postet ihn als GitHub-Issue-Kommentar -> Push-Benachrichtigung
// auf dem Handy (GitHub-App). Output: stdout (fuer den Workflow) + reports/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const dir = new URL('../content/', import.meta.url);
let history = [];
try {
  history = (await readFile(new URL('stats-history.ndjson', dir), 'utf8'))
    .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
} catch {}
if (!history.length) { console.log('Noch keine Stats vorhanden.'); process.exit(0); }

const now = history.at(-1);
const dayAgo = history.findLast(h => new Date(h.ts).getTime() < Date.now() - 20 * 3600000) || history[0];
const weekAgo = history.findLast(h => new Date(h.ts).getTime() < Date.now() - 6.5 * 86400000) || history[0];

const d = (a, b) => (a ?? 0) - (b ?? 0);
const sign = n => (n > 0 ? `+${n}` : `${n}`);
const t = now.totals, td = dayAgo.totals, tw = weekAgo.totals;

const brandLines = Object.entries(now.brands)
  .sort((a, b) => ((b[1].fbFans || 0) + (b[1].igFollowers || 0)) - ((a[1].fbFans || 0) + (a[1].igFollowers || 0)))
  .map(([id, b]) => `| ${b.name} | ${b.connected ? '🟢' : '⚪️'} | ${b.igFollowers ?? '—'} | ${b.fbFans ?? '—'} | ${b.posted7d} | ${b.errors || ''} |`)
  .join('\n');

const alerts = [];
if (t.errors > 0) alerts.push(`⚠️ **${t.errors} Posting-Fehler** — Details in den Brand-Kalendern (status: error).`);
if (t.escalationsOpen > 0) alerts.push(`🚩 **${t.escalationsOpen} Eskalationen** warten auf deine persoenliche Antwort (data/escalations.ndjson).`);
if (t.scheduled < 50) alerts.push(`📉 Content-Vorrat niedrig (${t.scheduled} geplant) — Replenish prueft heute Nacht automatisch.`);
if (t.connectedBrands === 0) alerts.push('🔌 Noch keine Marke verbunden — BRANDS_META_JSON Secret fehlt.');

const md = `## 📊 Tages-Update ${now.ts.slice(0, 10)}

| Kennzahl | Stand | 24h | 7 Tage |
|---|---|---|---|
| Follower gesamt (FB+IG) | **${t.followersTotal}** | ${sign(d(t.followersTotal, td.followersTotal))} | ${sign(d(t.followersTotal, tw.followersTotal))} |
| Posts (letzte 7 Tage) | ${t.posted7d} | | |
| Geplant im Kalender | ${t.scheduled} | | |
| Verbundene Marken | ${t.connectedBrands}/11 | | |

${alerts.length ? alerts.join('\n') + '\n' : '✅ Keine Auffaelligkeiten — Maschine laeuft.\n'}
<details><summary>Alle Marken</summary>

| Marke | Status | IG | FB | Posts 7d | Fehler |
|---|---|---|---|---|---|
${brandLines}
</details>`;

await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
await writeFile(new URL(`../reports/daily-${now.ts.slice(0, 10)}.md`, import.meta.url), md);
console.log(md);
