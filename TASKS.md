# TASKS.md — Priorisierte Aufgabenliste für Claude Code

---

## 🔴 BLOCK 1: Army System (Sofort, höchste Priorität)

### TASK 1.1 — PDF-Parser neu bauen
**Datei:** `js/api.js` (oder direkt in army.js)
**Problem:** Aktueller Parser gibt Fehler oder falsche Daten zurück
**Lösung:**
- FileReader.readAsDataURL → base64 extraction (nach dem Komma split)
- Fetch zu `https://api.anthropic.com/v1/messages` mit korrekten Headers
- Document-Block für PDF im Message-Array
- Exakter Parse-Prompt aus SPEC.md Abschnitt 1a verwenden
- Robustes JSON-Extraction: `text.slice(text.indexOf('{'), text.lastIndexOf('}')+1)`
- Error-Handling: Toast mit konkreter Fehlermeldung (nicht nur "failed")
- Test: Havoc Dwarves PDF → muss echte Einheiten zeigen

### TASK 1.2 — Army Library implementieren
**Datei:** `js/army.js`
**UI:** Army Selection Screen (Schritt 1 Wizard) komplett neu gestalten
- Linke Seite: gespeicherte Armeen aus `opr_army_library` in localStorage
- Rechte Seite: Upload-Zone (PDF bevorzugt, JSON mit Warnung)
- Nach erfolgreichem Upload: automatisch in Library speichern
- Library-Eintrag: `{id, name, faction, points, lastPlayed, gamesPlayed, units[]}`
- ✕ Button zum Löschen (mit confirm())
- Im Hauptmenü → Library → Armies Tab: alle Armeen verwalten

### TASK 1.3 — Basegröße-Dialog aktivieren
**Datei:** `js/army.js`
**Problem:** Modal existiert, wird aber nie gezeigt
**Lösung:**
- Nach Army-Upload: für jede Einheit prüfen ob in `opr_unit_library`
- Wenn nicht: Modal öffnen mit Einheitenname
- Schnell-Buttons: [25mm Inf] [40mm Elite] [50mm Monster] [25×50mm Kavallerie]
- Footprint live berechnen: `(bw × fw / 25.4).toFixed(1)` Zoll
- Nach Bestätigung: in `opr_unit_library` speichern
- Bei mehreren neuen Einheiten: Queue, eine nach der anderen
- Fortschritts-Anzeige: "Einheit 3 von 7"

---

## 🟠 BLOCK 2: Spielfeld-Phasen (Nach Block 1)

### TASK 2.1 — Phasen-Architektur
**Datei:** `js/phases.js` (neu)
**Konzept:**
```javascript
const GAME_PHASES = ['terrain', 'objectives', 'deployment', 'activation'];
let currentPhase = 'terrain';

function enterPhase(phase) {
  // Zeigt Phasen-Banner, richtet UI ein, startet Phase-Logik
}
```
- Phasen-Banner: goldener Modal-Header mit Phase-Name + Erklärung + "Verstanden →"
- Jede Phase hat: `init()`, `isComplete()`, `finish()`

### TASK 2.2 — Terrain-Phase (Drag & Drop)
**Datei:** `js/terrain.js`
**Terrain-Sidebar:** rechts, 280px, alle Bibliotheks-Stücke
**Drag & Drop Implementierung:**
```javascript
// Vanilla JS Drag & Drop
terrainItem.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', duringDrag);
document.addEventListener('mouseup', endDrag);

// Koordinaten: canvas → field inches
function canvasToField(canvasX, canvasY) {
  return { x: (canvasX - S.canvas.ox) / S.canvas.scale,
           y: (canvasY - S.canvas.oy) / S.canvas.scale };
}
```
- Geist-Element folgt Maus (position:fixed, pointer-events:none)
- Drop auf Canvas → Terrain-Objekt erstellen
- ✓/✕ Buttons als HTML über Canvas (position:absolute)
- ✓ → `confirmed: true`, Buttons ausblenden
- ✕ → Terrain entfernen, Sidebar-Stück wieder aktiv
- Hover auf confirmed Terrain → "✏️" Button erscheint

### TASK 2.3 — Objective-Phase
**Datei:** `js/objectives.js`
**Anzahl:** D3+2 (würfeln oder in Setup wählen, default: 3 für 4-Runden-Spiel)
**Flow:**
1. Roll-off animieren (kurze Würfelanimation)
2. Gewinner-Anzeige
3. Wenn Spieler dran: Cursor = crosshair, Klick platziert Marker
4. Validierung (Zone-Check, 9" Abstand) vor Placement
5. ✓/✕ unter Marker
6. Wenn KI dran: "KI überlegt..." → 1.5s → Marker erscheint
7. Weiter bis alle platziert

### TASK 2.4 — Deployment-Phase (visuell)
**Datei:** `js/deployment.js`
**Sidebars:** HTML-Elemente, nicht Canvas
**Einheiten-Block in Sidebar:**
```javascript
function renderUnitBlockSidebar(unit, container) {
  // Mini-Canvas oder SVG: proportionales Rechteck
  // Gleiche Farben wie auf Spielfeld
  // Frontlinie, Name, HP
  // Footprint: (formW*baseW/25.4) × (formD*baseD/25.4) Zoll
  // Skaliert auf max. Sidebar-Breite (240px)
}
```
**Drag & Drop:**
- Drag von Sidebar → Spielfeld-Canvas
- Einheit folgt Maus als Geist
- Drop in Deployment-Zone → platzieren
- Koordinaten-Badge: position:absolute über Canvas
- Rotation-Buttons: HTML-Overlay
- ✓/✕: HTML-Overlay

---

## 🟡 BLOCK 3: Qualität & Stabilität (Nach Block 2)

### TASK 3.1 — Code aufteilen
- Aktuelle `opr-simulator.html` (5400 Zeilen) → separate Dateien
- Empfohlene Struktur in SPEC.md Abschnitt 4

### TASK 3.2 — Fehlerbehandlung verbessern
- Alle API-Calls: detaillierte Fehlermeldungen
- Netzwerk-Fehler vs. API-Fehler vs. Parse-Fehler unterscheiden
- Console.error für alle Fehler

### TASK 3.3 — Army Upload Feedback
- Lade-Animation während Parse
- Fortschritts-Anzeige: "Lese PDF...", "Extrahiere Einheiten...", "Fertig!"
- Nach erfolgreichem Upload: Einheiten-Liste zur Bestätigung anzeigen
- "Stimmt das?" Dialog mit Bearbeiten-Möglichkeit

---

## 🟢 BLOCK 4: Nice to Have (Langfristig)

### TASK 4.1 — Campaign Rules
- Eigener Spielmodus
- XP, Traits, Injuries
- Zwischen Spielen: Einheiten upgraden

### TASK 4.2 — Spielstand speichern/laden
- Export als JSON-Datei
- Import und Spiel fortsetzen

### TASK 4.3 — Terrain Foto-Import
- Foto hochladen → Claude erkennt Größe
- Neues Terrain in Bibliothek speichern

### TASK 4.4 — Hybrid Analog vollständig
- Alle Würfelabfragen im Kampf manuell eingeben
- Separate UI für jede Würfelphase

---

## Startreihenfolge für Claude Code

```
1. TASK 1.1 (PDF Parser) — testen mit echten Army Forge PDFs
2. TASK 1.2 (Army Library) — UI komplett neu
3. TASK 1.3 (Basegröße Dialog) — aktivieren und testen
4. TASK 2.1 (Phasen-Architektur) — Grundgerüst
5. TASK 2.2 (Terrain Drag&Drop)
6. TASK 2.3 (Objectives)
7. TASK 2.4 (Deployment visuell)
8. TASK 3.1 (Code aufteilen)
```

---

## Test-Dateien

Folgende Test-PDFs sollten verwendet werden:
- `Havoc_Dwarves.pdf` — Spieler-Armee
- `Mummified_Undead.pdf` — KI-Armee

Erwartete Einheiten (Havoc Dwarves, 1500pts, 8 Aktivierungen, 73 Modelle):
→ Exakte Namen aus dem PDF müssen erscheinen, keine erfundenen Namen

---

## Wichtige Hinweise für Claude Code

1. **Keinen `clip-path` auf Buttons setzen** — war ein Klick-Bug
2. **Modellname ist `claude-sonnet-4-6`** — nicht claude-sonnet-4-20250514
3. **Header `anthropic-dangerous-direct-browser-access: 'true'`** muss bei JEDEM API-Call dabei sein
4. **localStorage Key für API:** `opr_key`
5. **Keine function declarations mit gleichem Namen** — JS-Hoisting macht alle Overrides kaputt, stattdessen const/let verwenden
6. **Unicode Escapes `\u{XXXX}` nur in Template Literals** — in normalen Strings Syntax Error
