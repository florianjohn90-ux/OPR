# CLAUDE_CODE_START.md — Sofort-Einstieg für Claude Code

## Was du bekommst

Dieses Paket enthält:
- `opr-simulator.html` — der aktuelle Simulator (5400 Zeilen, läuft im Browser)
- `STATUS.md` — vollständiger Projektstatus (was funktioniert, was nicht)
- `SPEC.md` — vollständige Spezifikation aller gewünschten Features
- `TASKS.md` — priorisierte Aufgabenliste
- `CLAUDE_CODE_START.md` — diese Datei

## Kontext in 2 Sätzen

Ein OPR Age of Fantasy Regiments Solo-Simulator als Single-HTML-File.
Grundsystem läuft, aber Army-Upload zeigt falsche Einheiten und die Spielfeld-Eröffnung (Terrain/Objectives/Deployment) fehlt als interaktives System.

## Erste Aufgabe: PDF-Parser fixen (TASK 1.1)

```bash
# Öffne die Datei:
open opr-simulator.html   # oder im Browser öffnen

# Suche nach dieser Funktion:
# async function handleArmyUpload(side, input)
# Sie ist ca. bei Zeile 1180

# Das Problem:
# - PDF wird als base64 korrekt gelesen
# - API-Call schlägt aber manchmal fehl
# - JSON-Upload erfindet Einheiten (Army Forge JSON hat keine lesbaren Namen)
```

**Teste so:**
1. Browser öffnen → opr-simulator.html
2. API Key eingeben (🔑 Button im Hauptmenü)
3. New Battle → Army Selection
4. "🔌 API Verbindung testen" → muss ✅ grün werden
5. PDF hochladen → Einheitenliste muss EXAKT dem PDF entsprechen

## Zweite Aufgabe: Army Library (TASK 1.2)

Nach erfolgreichem PDF-Parse soll die Armee gespeichert werden.
Beim nächsten Spielstart: gespeicherte Armee auswählen statt neu hochladen.

## Dritte Aufgabe: Basegröße-Dialog (TASK 1.3)

Nach Upload: für jede unbekannte Einheit den Dialog zeigen.
Modal `baseSetupModal` existiert bereits im HTML (Zeile ~905).
Funktion `saveBaseSetup()` existiert (Zeile ~1466).
Aber: der Dialog wird nie geöffnet — muss nach Upload getriggert werden.

## Code-Struktur

```
opr-simulator.html enthält alles in dieser Reihenfolge:
1. <style>           — CSS (ca. 800 Zeilen)
2. <HTML>            — Screens, Modals, Canvas
3. <script>          — Alles JS (ca. 4000 Zeilen):
   - Konstanten (SR-Datenbank, KI-Fragen, Terrain)
   - State-Objekt S{}
   - Screen-Management
   - Setup-Wizard
   - Army Upload
   - Game Board / Canvas
   - Combat System
   - Spells
   - AI-System
   - Horde Mode
   - Mission Cards
   - Phase 3 Korrekturen
   - Phase 4 Korrekturen
   - Utility Functions
```

## Bekannte Fallstricke

```javascript
// ❌ FALSCH — JS Hoisting macht alle function-Overrides kaputt:
const _orig = myFunc;
function myFunc() { _orig(); }  // _orig === myFunc === Endlosschleife!

// ✅ RICHTIG — eine konsolidierte Funktion:
function myFunc() { /* alles hier drin */ }

// ❌ FALSCH — Syntax Error in normalen Strings:
addLog('\u{1F480} destroyed');

// ✅ RICHTIG:
addLog('💀 destroyed');
// oder:
addLog(`\u{1F480} destroyed`);  // nur in Template Literals OK

// ❌ FALSCH — fehlt bei jedem API-Call:
headers: { 'Content-Type': 'application/json' }

// ✅ RICHTIG:
headers: {
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
}
```

## Nach Block 1: Spielfeld-Phasen

Sobald Army-Upload + Library + Basegrößen funktionieren:
→ Komplette Neuentwicklung der Spielfeld-Eröffnung (SPEC.md Abschnitt 2)

Das ist der größte Umbau:
- Terrain: Drag & Drop von Sidebar aufs Canvas
- Objectives: Click-to-place mit Validierung  
- Deployment: visuelle Einheiten-Blöcke in Sidebars, Drag & Drop

Details in SPEC.md und TASKS.md.

## Viel Erfolg!
