# Runbook: Umzug der Lead-Maschine aus OPR in ein eigenes Repo

Kontext: Das Repo `florianjohn90-ux/OPR` enthält eigentlich einen Tabletop-Simulator.
Die Lead-Maschine (alles unter `leadgen/` + Workflow + Skills) wurde hier nur
entwickelt und soll in ein eigenes Repo (z. B. `florianjohn90-ux/leadgen`) umziehen.
Quelle: Branch `claude/social-media-lead-gen-kbrujm` in OPR.

## Was umzieht (Struktur 1:1 beibehalten — Workflow-Pfade hängen daran!)

```
leadgen/                                   (komplett, inkl. dieses Files)
.github/workflows/social-autopilot.yml
.agents/                                   (Higgsfield-Skills)
.claude/                                   (Skill-Symlinks)
skills-lock.json
```

## Schritte für Claude (Session läuft auf dem NEUEN Repo)

1. Falls OPR nicht im Zugriff: `add_repo` für `florianjohn90-ux/OPR` (lesend reicht).
2. Inhalte vom OPR-Branch `claude/social-media-lead-gen-kbrujm` übernehmen
   (Liste oben), Struktur unverändert lassen.
3. Im neuen Repo Referenzen anpassen: In `leadgen/BRANDS.md`,
   `leadgen/HIGGSFIELD-LOGIN.md`, `leadgen/README.md` alle Erwähnungen
   „Repo OPR" → neuer Repo-Name (betrifft die GitHub-Secret-Anleitungen).
4. Auf den **main**-Branch des neuen Repos committen und pushen.
5. Prüfen: GitHub Actions im neuen Repo aktiv? (Settings → Actions → erlaubt).
   Workflow `Social Autopilot` muss unter Actions auftauchen.
6. Dem Nutzer die Secret-Liste geben (BRANDS_META_JSON, ANTHROPIC_API_KEY,
   HIGGSFIELD_CREDENTIALS + Variable PUBLIC_ASSET_BASE) — diese müssen im
   NEUEN Repo angelegt werden.
7. **Aufräumen in OPR** (sobald Migration verifiziert): auf Branch
   `claude/social-media-lead-gen-kbrujm` die oben gelisteten Pfade entfernen
   (`git rm -r leadgen .github/workflows/social-autopilot.yml .agents .claude skills-lock.json`),
   committen, pushen. OPR enthält danach wieder nur den Simulator.
8. Danach: `leadgen/HIGGSFIELD-LOGIN.md` ausführen (Higgsfield-Device-Login).

## Wichtig

- Der Nutzer ist nicht technisch: alles Schritt für Schritt, Safari + Klicks.
- Keine Credentials/Tokens committen. Secrets nur über GitHub-Secret-UI.
- Tägliche Status-Reports laufen über ein Issue im NEUEN Repo (daily-report-Job).
