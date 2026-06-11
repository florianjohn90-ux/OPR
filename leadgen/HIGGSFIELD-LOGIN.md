# Runbook: Higgsfield-Login (für Claude in einer neuen Session)

Kontext: Multi-Brand-Social-Autopilot in `leadgen/` (siehe README.md, PLAN-30-TAGE.md).
Higgsfield PLUS ist abonniert. Die CLI-Integration ist fertig
(`engine/higgsfield-fetch.mjs` + Workflow-Step mit Secret `HIGGSFIELD_CREDENTIALS`).
Es fehlt nur der einmalige Login. Die Umgebung wurde auf erlaubten Netzwerkzugriff
für higgsfield.ai umgestellt (gilt nur für neue Sessions — deshalb dieses Runbook).

## Schritte für Claude

1. CLI installieren (falls fehlt): `npm install -g @higgsfield/cli`
2. `higgsfield auth login` im Hintergrund starten und aus der Ausgabe die
   **Device-Login-URL (+ Code)** lesen.
3. Die URL dem Nutzer (Florian) im Chat geben: Er öffnet sie in Safari,
   loggt sich bei Higgsfield ein und bestätigt. Er ist NICHT technisch —
   nur den Link geben, freundlich, ein Schritt nach dem anderen.
4. Nach Bestätigung: `higgsfield account status` prüfen (muss eingeloggt sein,
   Workspace/Credits anzeigen).
5. Credentials-Datei finden (`higgsfield auth token` zeigt sie an; sonst
   `~/.higgsfield/credentials.json` oder `~/.config/higgsfield/credentials.json`,
   Env-Override: `HIGGSFIELD_CREDENTIALS_PATH`).
6. Den **kompletten Dateiinhalt** dem Nutzer als Codeblock geben mit
   Klick-Anleitung: GitHub → Repo OPR → Settings → Secrets and variables →
   Actions → New repository secret → Name `HIGGSFIELD_CREDENTIALS` → Inhalt
   einfügen → Save. (NIEMALS die Datei ins Repo committen!)
7. Live-Test: 1 Bild generieren, z. B.
   `higgsfield generate create <bild-modell> --prompt "<Prompt aus einem media-brief>" --aspect_ratio 4:5 --wait`
   Modell-Discovery: `higgsfield model list`. Ergebnis dem Nutzer zeigen.
8. Optional direkt: Briefs abarbeiten via `cd leadgen/engine && node higgsfield-fetch.mjs`
   (Drossel HF_MAX_PER_RUN beachten), Ergebnisse committen/pushen.

## Falls Netzwerk weiter blockt (HTTP 403 "Host not in allowlist")

Dem Nutzer sagen, welche Domains in der Umgebungs-Einstellung erlaubt sein müssen:
`higgsfield.ai`, `*.higgsfield.ai` (Device-Auth läuft u. a. über
`fnf-device-auth.higgsfield.ai`, API über `fnf.higgsfield.ai`).
Asset-Downloads liegen ggf. auf einem externen CDN — wenn Downloads in Schritt 7/8
scheitern, die fehlende Domain aus der Fehlermeldung ebenfalls freigeben lassen
(oder kurzzeitig „Unrestricted").
