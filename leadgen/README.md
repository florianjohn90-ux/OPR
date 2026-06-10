# Lead-Maschine — ETF-Sparplan fürs Kind (100% organisch)

Vollautomatische Social-Media-Lead-Maschine für **FNF Finanzen**.
Zielgruppe: junge Eltern, die einen **ETF-/Fondssparplan fürs Kind** abschließen wollen.
Ziel-Output: **20 stattfindende 60-Min-Termine pro Woche** (Beratung & Abschluss machst du).

> Strategie: **kein Werbebudget.** Volumen entsteht aus *Content-Velocity* (viel
> guter, plattformgerechter organischer Content auf echten Accounts) **mal**
> *Funnel-Konversion* (aus wenig Traffic überdurchschnittlich viele qualifizierte,
> erscheinende Termine). Beide Hebel sind hier als laufendes System gebaut.

---

## 1. Die Maschine in einem Bild

```
   ┌─────────────────────────────────────────────────────────────────┐
   │  ENGINE (Node)                                                    │
   │  research.mjs  →  generate.mjs  →  calendar.mjs  →  publish.mjs   │
   │  Themen finden    Posts/Reels      30-Tage-Plan     FB + IG live  │
   │  (Trends+Seeds)   (Claude API)     (Slots/Hooks)    (Graph API)   │
   └───────────────────────────────┬─────────────────────────────────┘
                                    │  CTA in jedem Post
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  FUNNEL (funnel/index.html)                                       │
   │  Hook → Sparrechner (Engagement) → Qualifizierungs-Quiz           │
   │  → cal.com-Buchung (heiß)   ODER   E-Mail/Lead-Magnet (warm)      │
   └───────────────────────────────┬─────────────────────────────────┘
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  LEAD-PIPELINE (api/)                                             │
   │  lead.mjs (Capture + DSGVO Double-Opt-in)                         │
   │  → confirm.mjs (Bestätigung) → Nurture-Mails → cal.com-Termin     │
   │  → Reminder/No-Show-Reduktion → Termin findet statt              │
   └─────────────────────────────────────────────────────────────────┘
```

---

## 2. AUTOPILOT — die Maschine läuft ohne dich

Der komplette Betrieb läuft über **GitHub Actions** (`.github/workflows/social-autopilot.yml`):

- **Alle 30 Min (07–20 UTC):** postet fällige Posts aus `content/calendar.json`
  automatisch auf die Facebook-Seite (Bild wird direkt hochgeladen) und auf
  Instagram (sobald `PUBLIC_ASSET_BASE` gesetzt ist). Status wird ins Repo committet.
- **Täglich 03:00 UTC:** prüft den Content-Vorrat. Unter 1 Woche? Dann generiert
  Claude automatisch 12 neue Posts (`replenish.mjs`), plant sie ein (`calendar.mjs`)
  und rendert die Bilder (`render-image.mjs`). Nachschub ist also unendlich.

**Bereits fertig im Repo:** 24 handgeschriebene Posts (`content/bank.json`),
48 eingeplante Slots über ~12 Tage (`content/calendar.json`) und 48 fertig
gerenderte Post-Grafiken (`content/assets/*.jpg`) — Branding, Hook, CTA,
Pflichthinweis, alles drauf.

### Der EINZIGE einmalige Handgriff (≈10 Minuten, danach 0 Arbeit)

Zugänge kann dir niemand abnehmen — Meta vergibt Tokens nur an den Konto-Inhaber.
Einmal eintragen unter **GitHub → Repo → Settings → Secrets and variables → Actions**:

| Secret | Woher |
|---|---|
| `META_PAGE_ID` | deine Facebook-Seite → Info |
| `META_PAGE_TOKEN` | developers.facebook.com → Page Access Token (long-lived) |
| `META_IG_USER_ID` | mit der Seite verknüpfter IG-Business-Account |
| `ANTHROPIC_API_KEY` | console.anthropic.com (für den Content-Nachschub) |

Optional als Repository-**Variable**: `PUBLIC_ASSET_BASE` = öffentliche Basis-URL
der Bilder (z. B. `https://raw.githubusercontent.com/<user>/<repo>/<branch>/leadgen`
bei öffentlichem Repo, sonst Funnel-Hosting-URL). Ohne sie laufen Facebook-Posts
trotzdem voll automatisch; Instagram braucht die URL (Meta lädt IG-Bilder nur von
öffentlichen URLs).

Sobald die Secrets drin sind: nichts mehr tun. Posten, Nachschub, Status — alles automatisch.

---

## 3. Manuelle Nutzung (optional, für lokalen Betrieb)

Kopiere `engine/.env.example` nach `engine/.env` und fülle aus:

| Variable | Wofür | Woher |
|---|---|---|
| `ANTHROPIC_API_KEY` | Content-Generierung | console.anthropic.com |
| `META_PAGE_ID` | FB-Seite (organisch posten) | Facebook-Seite → Info |
| `META_PAGE_TOKEN` | Page Access Token (organisch) | developers.facebook.com → Graph API |
| `META_IG_USER_ID` | Instagram Business Account | mit FB-Seite verknüpft |
| `CALCOM_LINK` | Buchungslink 60-Min-Gespräch | cal.com → Event-Type |
| `SMTP_*` | Double-Opt-in & Nurture-Mails | dein Mailprovider/Gmail SMTP |
| `BASE_URL` | öffentliche URL des Funnels | dein Hosting |

> **Wichtig zu organischem Meta-Posting:** Das erledigt `publish-meta.mjs` über die
> **Content Publishing API** mit einem *Page Token* (FB) bzw. der IG-Graph-API.
> Du brauchst eine FB-Seite + verknüpften **Instagram-Business/Creator-Account**.
> Persönliche Profile lassen sich per API nicht bespielen — dafür gibt es den
> `--review`-Modus (Posts werden als Datei/Entwurf ausgegeben, du postest mit 1 Klick).

---

## 3. Schnellstart

```bash
cd leadgen/engine
npm install
cp .env.example .env        # ausfüllen

# 1) Themen recherchieren (Trends + Seed-Bank)
node research.mjs

# 2) Content-Batch generieren (FB + IG: Captions, Carousels, Reel-Skripte, Hashtags)
node generate.mjs --count 30

# 3) 30-Tage-Posting-Kalender bauen
node calendar.mjs

# 4a) Live auf FB + IG veröffentlichen (Cron: stündlich)
node publish-meta.mjs

# 4b) ODER Review-Modus: Posts als Datei, du veröffentlichst selbst
node publish-meta.mjs --review
```

Den Funnel (`funnel/index.html`) auf beliebigem Static-Hosting (Netlify, Vercel,
GitHub Pages, eigener Server) ausspielen. Die Lead-Endpoints in `api/` laufen als
Serverless-Functions (Vercel/Netlify) oder hinter einem kleinen Node-Server.

---

## 4. Wie aus Content tatsächlich 20 erscheinende Termine/Woche werden

Organisch ist es eine Konversions-Kette. Die Engine optimiert jeden Schritt:

1. **Content-Velocity:** 1–3 Posts/Tag pro Plattform (Reels = höchste organische
   Reichweite). Reels-first, Carousels für Tiefe, Stories für CTA-Wiederholung.
2. **Hook-Qualität:** jeder Post startet mit einem getesteten Hook (Schmerz/Neugier/
   Zahl). Schwache Hooks = keine Reichweite. Die Engine erzeugt 3 Hook-Varianten je Post.
3. **CTA-Konsistenz:** jeder Post führt zum Funnel (Bio-Link / „Kommentar = Link").
4. **On-Page-Engagement:** Der **Sparrechner** auf dem Funnel hält Leute auf der Seite
   und liefert das „Aha" (aus 50 €/Monat werden bis zur Volljährigkeit ~X €).
5. **Qualifizierung:** Mini-Quiz (Alter des Kindes, Sparrate, Ziel) filtert Ernsthafte.
   Qualifizierte Leads zeigen sich deutlich häufiger zum Termin.
6. **No-Show-Reduktion:** Double-Opt-in + Termin-Reminder (E-Mail) + Reschedule-Option.
   Show-Rate ist der unterschätzteste Hebel — hier steckt die Hälfte der „20/Woche".

**Rechenlogik (Stellschrauben in `config/targets.json`):**
```
Termine erscheinen/Woche = Funnel-Besucher × Buchungsrate × Show-Rate
20 = Besucher × 0,04 × 0,6   →   ~835 qualifizierte Funnel-Besucher/Woche
```
Die Engine misst jede Stufe und sagt dir, welcher Hebel gerade limitiert
(zu wenig Reichweite? schwache Buchungsrate? No-Shows?), damit du gezielt nachsteuerst.

---

## 5. Compliance (eingebaut, nicht nachträglich)

- **DSGVO:** Double-Opt-in für jede E-Mail-Erfassung, Consent-Checkbox, Zweckbindung,
  Datenschutz- & Impressums-Links im Funnel-Footer (Platzhalter → bitte ausfüllen).
- **Finanzwerbung:** Der Funnel macht **keine** Anlageberatung und verspricht keine
  Renditen — er nennt Chancen *und* Risiken (Kursschwankungen, Kapitalverlust möglich)
  und führt zum persönlichen Gespräch. Beratung/Abschluss machst ausschließlich du.
- **Plattform-ToS:** Echte Marken-/Creator-Accounts, plattformspezifischer Content,
  kein identischer Spam über Fake-Accounts (das führt zu Sperren). Skaliert *und* sicher.

---

## 6. Verzeichnisstruktur

```
leadgen/
├── README.md                 ← dieses Dokument
├── funnel/
│   ├── index.html            ← Landingpage: Hook, Sparrechner, Quiz, Buchung
│   └── danke.html            ← Double-Opt-in-Bestätigung + Buchung
├── engine/
│   ├── package.json
│   ├── .env.example
│   ├── lib/claude.mjs        ← Anthropic-API-Client
│   ├── research.mjs          ← Themen-Research (Trends + Seed-Bank)
│   ├── generate.mjs          ← Content-Generierung (FB+IG)
│   ├── calendar.mjs          ← 30-Tage-Posting-Kalender
│   └── publish-meta.mjs      ← organisches Posten via Meta Graph API
├── api/
│   ├── lead.mjs              ← Lead-Capture + DSGVO Double-Opt-in
│   └── confirm.mjs           ← Opt-in-Bestätigung
├── content/                  ← generierter Content landet hier
│   └── STARTER-PACK.md       ← 10 sofort postbare Inhalte
└── config/
    └── targets.json          ← Ziel-Kennzahlen & Stellschrauben
```
