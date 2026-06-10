// publish-meta.mjs — veroeffentlicht faellige Posts aus content/calendar.json organisch.
// Facebook-Seite: Graph API /feed.   Instagram: Container -> publish.
//
//   node publish-meta.mjs            -> postet alle ueberfaelligen Slots live
//   node publish-meta.mjs --review   -> postet NICHTS, schreibt content/to-post.md (manuell)
//
// Hinweis: Bildgenerierung/Asset ist bewusst getrennt. Fuer Reels/Carousels braucht Meta
// gehostete Medien-URLs (image_url/video_url). Lege deine Asset-URL je Post in `mediaUrl`,
// oder nutze --review und poste die fertigen Texte/Skripte manuell (passt zu "selbst gestrickt").
import { readFile, writeFile } from 'node:fs/promises';

const REVIEW = process.argv.includes('--review');
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const PAGE = process.env.META_PAGE_ID, TOKEN = process.env.META_PAGE_TOKEN, IG = process.env.META_IG_USER_ID;
const calUrl = new URL('../content/calendar.json', import.meta.url);

const plan = JSON.parse(await readFile(calUrl, 'utf8'));
const now = Date.now();
const due = plan.filter(p => p.status === 'scheduled' && new Date(p.scheduledFor).getTime() <= now);

if (!due.length) { console.log('Nichts faellig. Naechster Slot:', plan.find(p => p.status === 'scheduled')?.scheduledFor || '—'); process.exit(0); }

function text(p) {
  const tags = (p.hashtags || []).join(' ');
  return `${p.caption || p.hook}\n\n${tags}`.trim();
}

async function graph(path, body) {
  const res = await fetch(`https://graph.facebook.com/${V}/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
  return data;
}

if (REVIEW) {
  const md = due.map((p, i) =>
    `## ${i + 1}. [${p.platform} · ${p.format}] ${p.scheduledFor}\n**Hook:** ${p.hook}\n\n${text(p)}\n`).join('\n---\n\n');
  await writeFile(new URL('../content/to-post.md', import.meta.url), `# Jetzt zu posten (${due.length})\n\n${md}`);
  console.log(`📝 Review-Modus: ${due.length} Posts -> content/to-post.md (manuell veroeffentlichen)`);
  process.exit(0);
}

if (!PAGE || !TOKEN) { console.error('META_PAGE_ID / META_PAGE_TOKEN fehlen in .env'); process.exit(1); }

let ok = 0;
for (const p of due) {
  try {
    if (p.platform === 'facebook') {
      // Mit mediaUrl -> Foto-Post, sonst Text-Post.
      if (p.mediaUrl) await graph(`${PAGE}/photos`, { url: p.mediaUrl, caption: text(p) });
      else await graph(`${PAGE}/feed`, { message: text(p) });
    } else if (p.platform === 'instagram') {
      if (!IG) throw new Error('META_IG_USER_ID fehlt');
      if (!p.mediaUrl) throw new Error('Instagram benoetigt mediaUrl (Bild/Video)');
      const c = await graph(`${IG}/media`, { image_url: p.mediaUrl, caption: text(p) });
      await graph(`${IG}/media_publish`, { creation_id: c.id });
    }
    p.status = 'posted'; p.postedAt = new Date().toISOString(); ok++;
    console.log(`✓ ${p.platform} ${p.format} — ${p.hook.slice(0, 40)}`);
  } catch (e) {
    p.status = 'error'; p.error = e.message;
    console.log(`✗ ${p.platform} — ${e.message.slice(0, 120)}`);
  }
}

await writeFile(calUrl, JSON.stringify(plan, null, 2));
console.log(`\n✅ ${ok}/${due.length} veroeffentlicht. Status in content/calendar.json aktualisiert.`);
