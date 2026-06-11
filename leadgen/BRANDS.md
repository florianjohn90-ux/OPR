# Deine Checkliste für morgen: 11 Marken-Accounts anlegen

Pro Marke: **1 Facebook-Seite + 1 Instagram-Business-Account** (verknüpft).
Danach trägst du EIN Secret ein — fertig, die Maschine übernimmt alles.

## Die 11 Marken

| # | Marke | IG-Handle (Vorschlag) | Nische | Design |
|---|---|---|---|---|
| 1 | **FNF Finanzen** | @fnf.finanzen | Hauptmarke, Florian persönlich | Dunkel/Fintech, grün-gold |
| 2 | **Mama & Moneten** | @mama.und.moneten | Mütter, mentale Last, sanfte Schritte | Pastell, Serifen-Italic, Blobs |
| 3 | **Papa rechnet** | @papa.rechnet | Väter, Zahlen & Beispielrechnungen | Schwarz/Gelb, Magazin, GROSSBUCHSTABEN |
| 4 | **Sparfuchs-Familie** | @sparfuchs.familie | Alltags-Spartipps + investieren | Sticky-Notes, verspielt schräg |
| 5 | **Enkelgeld** | @enkelgeld | Großeltern & Geldgeschenke | Briefpapier, Linien, ruhig |
| 6 | **Elternzeit & Euros** | @elternzeit.euros | Frischgebackene Eltern, Kurz-Tipps | Chat-Verlauf (Messenger-Optik) |
| 7 | **Kindergeld-Hacks** | @kindergeld.hacks | Staatliche Förderungen ausschöpfen | Zeitungs-Layout, schwarz/weiß/rot |
| 8 | **projekt zukunftskind** | @projekt.zukunftskind | Planer-Eltern, ruhig, reduziert | Minimal, viel Weißraum, kleinschreibung |
| 9 | **Team Familienkasse** | @team.familienkasse | Echte Familien-Geldgeschichten | Polaroid/Foto-Rahmen, gekippt |
| 10 | **Mit 18 frei** | @mit18frei | Emotion: Volljährigkeit & Startkapital | Warme Brauntöne, Zitat-Optik |
| 11 | **MiniMoney Club** | @minimoney.club | Kindern Geld erklären (Edutainment) | Bunt, runde Formen, verspielt |

Handles belegt? Variante nehmen (z. B. @mama.moneten, @papa_rechnet) und mir die
finalen Handles nennen — ich passe `config/brands.json` an.

## Pro Marke (≈ 15 Min)

1. **Facebook-Seite** erstellen (facebook.com/pages/create) — Name wie oben.
2. **Instagram-Account** erstellen → in den Einstellungen auf **Business** umstellen
   → mit der FB-Seite verknüpfen.
3. **Profil-Bio:** Tagline (siehe `config/brands.json`) + Funnel-Link
   + Pflichtzeile „Ein Angebot der FNF Finanzen" (Impressum verlinken).
4. In **business.facebook.com** alle Seiten unter dein Business-Manager-Konto hängen.

## Tokens holen (einmalig, ≈ 20 Min für alle)

Empfohlen: **System User** im Business Manager (Token läuft nie ab):
1. business.facebook.com → Unternehmenseinstellungen → System-Nutzer → erstellen (Admin).
2. Alle 11 Seiten + IG-Accounts dem System-Nutzer zuweisen.
3. Token generieren mit Berechtigungen: `pages_manage_posts`, `pages_read_engagement`,
   `pages_manage_engagement`, `pages_messaging`, `instagram_basic`,
   `instagram_content_publish`, `instagram_manage_comments`.
4. Pro Seite die **Page-ID** (Seite → Info) und **IG-User-ID** notieren
   (graph.facebook.com/me/accounts mit dem Token zeigt alles auf einmal).

## Das EINE Secret

GitHub → Repo → Settings → Secrets and variables → Actions → New secret:
**Name:** `BRANDS_META_JSON` — **Wert** (Beispiel, mit deinen IDs):

```json
{
  "fnf":            {"pageId":"111", "pageToken":"EAAB...", "igUserId":"178..."},
  "mamamoney":      {"pageId":"222", "pageToken":"EAAB...", "igUserId":"178..."},
  "paparechnet":    {"pageId":"333", "pageToken":"EAAB...", "igUserId":"178..."},
  "sparfuchs":      {"pageId":"...", "pageToken":"...", "igUserId":"..."},
  "enkelgeld":      {"pageId":"...", "pageToken":"...", "igUserId":"..."},
  "elternzeit":     {"pageId":"...", "pageToken":"...", "igUserId":"..."},
  "kindergeldhacks":{"pageId":"...", "pageToken":"...", "igUserId":"..."},
  "zukunftskind":   {"pageId":"...", "pageToken":"...", "igUserId":"..."},
  "familienkasse":  {"pageId":"...", "pageToken":"...", "igUserId":"..."},
  "mit18frei":      {"pageId":"...", "pageToken":"...", "igUserId":"..."},
  "minimoney":      {"pageId":"...", "pageToken":"...", "igUserId":"..."}
}
```

(Beim System-User ist `pageToken` für alle Marken derselbe — einfach überall einsetzen.)

Dazu (falls noch nicht geschehen): Secret `ANTHROPIC_API_KEY` und Variable
`PUBLIC_ASSET_BASE`. **Du kannst auch mit 2-3 Marken starten** — Marken ohne
Eintrag überspringt die Maschine sauber und holt sie nach, sobald der Eintrag da ist.

## Was dann automatisch passiert

- Der erste Replenish-Lauf textet alle 792 geplanten Posts **pro Marke neu**
  (eigene Stimme, eigene Beispiele — kein erkennbares Netzwerk).
- Posten startet sofort mit den gerenderten Grafiken; Reels mit Voiceover
  (6 verschiedene deutsche Stimmen über die Marken verteilt) folgen nach dem
  ersten nächtlichen Render-Lauf.
- Kommentare/DMs beantwortet jede Marke in ihrer eigenen Persona.
