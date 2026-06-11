// api/lead.mjs — Lead-Capture + DSGVO Double-Opt-in.
// Serverless-Handler (Vercel/Netlify Node) ODER hinter kleinem Node-Server.
// POST { name, email, answers, source } -> speichert "pending" + sendet Bestaetigungsmail.
import crypto from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import nodemailer from 'nodemailer';

const SECRET = process.env.LEAD_SECRET || 'dev-secret-bitte-aendern';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

// Signiertes Opt-in-Token (kein DB-Lookup noetig fuer die Bestaetigung).
export function sign(email, ts) {
  return crypto.createHmac('sha256', SECRET).update(email + '|' + ts).digest('hex').slice(0, 32);
}

async function store(record) {
  try {
    await mkdir(new URL('../data/', import.meta.url), { recursive: true });
    await appendFile(new URL('../data/leads.ndjson', import.meta.url), JSON.stringify(record) + '\n');
  } catch (e) { console.error('store failed', e.message); }
  // TODO: hier stattdessen ins CRM / Google Sheet schreiben (Drive-MCP/Webhook).
}

async function sendConfirmMail(name, email, link) {
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await t.sendMail({
    from: process.env.MAIL_FROM || 'FNF Finanzen <info@example.de>',
    to: email,
    subject: 'Bitte bestätige deine Anmeldung – ETF-Sparplan fürs Kind',
    text: `Hallo ${name},\n\nschön, dass du den ersten Schritt für dein Kind machst!\nBitte bestätige kurz deine E-Mail-Adresse, dann schalten wir deine persönliche Einschätzung frei und du kannst direkt einen Termin wählen:\n\n${link}\n\nWenn du das nicht warst, ignoriere diese Mail einfach.\n\nHerzliche Grüße\nFNF Finanzen`,
    html: `<p>Hallo ${name},</p><p>schön, dass du den ersten Schritt für dein Kind machst!</p>
<p>Bitte bestätige kurz deine E-Mail-Adresse – danach schalten wir deine persönliche Einschätzung frei und du kannst direkt einen Termin wählen:</p>
<p><a href="${link}" style="background:#36c08a;color:#06281c;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">E-Mail bestätigen &amp; Termin wählen</a></p>
<p style="color:#888;font-size:13px">Wenn du das nicht warst, ignoriere diese Mail einfach.</p>
<p>Herzliche Grüße<br/>FNF Finanzen</p>`
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, email, answers, source } = body || {};
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) return res.status(400).json({ error: 'invalid' });

    const ts = Date.now();
    const token = sign(email, ts);
    const link = `${BASE}/api/confirm?e=${encodeURIComponent(email)}&t=${ts}&s=${token}`;

    await store({ name, email, answers: answers || {}, source: source || 'funnel', ts, status: 'pending', ip: req.headers?.['x-forwarded-for'] || null });
    await sendConfirmMail(name, email, link);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('lead error', e);
    return res.status(500).json({ error: 'server' });
  }
}
