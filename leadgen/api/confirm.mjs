// api/confirm.mjs — bestaetigt das Double-Opt-in und leitet zur Buchung (danke.html).
// GET /api/confirm?e=<email>&t=<ts>&s=<signatur>
import { appendFile, mkdir } from 'node:fs/promises';
import { sign } from './lead.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const MAX_AGE_MS = 1000 * 60 * 60 * 72; // 72h gueltig

async function mark(email, ts) {
  try {
    await mkdir(new URL('../data/', import.meta.url), { recursive: true });
    await appendFile(new URL('../data/leads.ndjson', import.meta.url),
      JSON.stringify({ email, ts: Number(ts), status: 'confirmed', confirmedAt: Date.now() }) + '\n');
  } catch (e) { console.error('mark failed', e.message); }
  // TODO: im CRM auf "confirmed" setzen + Nurture-Sequenz starten.
}

export default async function handler(req, res) {
  const url = new URL(req.url, BASE);
  const e = url.searchParams.get('e'), t = url.searchParams.get('t'), s = url.searchParams.get('s');
  const valid = e && t && s && s === sign(e, t) && (Date.now() - Number(t) < MAX_AGE_MS);

  if (!valid) {
    res.statusCode = 302; res.setHeader('Location', `${BASE}/danke.html?status=error`); return res.end();
  }
  await mark(e, t);
  res.statusCode = 302; res.setHeader('Location', `${BASE}/danke.html?status=ok`); return res.end();
}
