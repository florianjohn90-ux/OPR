# SPEC.md — OPR Regiments Simulator: Vollständige Spezifikation

---

## 1. Army System (HÖCHSTE PRIORITÄT)

### 1a. PDF-Parser (neu bauen)

**Problem:** Der aktuelle PDF-Parser ist unzuverlässig.

**Lösung:**
```javascript
// Beim PDF-Upload:
// 1. FileReader.readAsDataURL(file) → base64
// 2. Claude API mit document block:
{
  model: 'claude-sonnet-4-6',
  messages: [{
    role: 'user',
    content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
      { type: 'text', text: ARMY_PARSE_PROMPT }
    ]
  }]
}
// Headers MÜSSEN enthalten:
// 'x-api-key': apiKey
// 'anthropic-version': '2023-06-01'  
// 'anthropic-dangerous-direct-browser-access': 'true'
```

**Parse-Prompt** (exakt so verwenden):
```
Parse this OPR Army Forge army list PDF completely.
Extract EVERY unit exactly as printed. Do not invent or add units.
Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "Army Name",
  "faction": "Faction Name", 
  "points": 1500,
  "units": [{
    "name": "Exact Unit Name from PDF",
    "models": 10,
    "quality": "3+",
    "defense": "4+",
    "tough": null,
    "weapons": [{"name": "Weapon Name", "range": "-", "attacks": "A2", "ap": 0, "special": ""}],
    "specialRules": ["Rule1", "Rule2"],
    "points": 150,
    "isHero": false,
    "upgrades": ["upgrade description"]
  }]
}
Rules: tough=null unless unit has Tough(X) rule. range="-" for melee weapons.
Extract upgrades as strings in the upgrades array.
```

**JSON-Upload:**
- Zeige deutliche Warnung: *"JSON enthält keine Einheitendaten — nur Armeename und Punkte werden geladen. Bitte PDF für vollständige Liste verwenden."*
- Lade trotzdem Name + Punkte aus dem JSON
- Zeige leere Einheitenliste mit Upload-Aufforderung

### 1b. Army Library

**Datenstruktur** (localStorage Key: `opr_army_library`):
```javascript
[
  {
    id: 'army_1234567890',        // timestamp
    name: 'Havoc Dwarves',
    faction: 'Havoc Dwarves',
    points: 1500,
    lastPlayed: '2026-05-26',     // ISO date
    gamesPlayed: 3,
    units: [ /* vollständige Einheitenliste */ ]
  }
]
```

**Army Selection UI** (Schritt 1 im Wizard):
```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  📚 Gespeicherte Armeen      │  │  📄 Neue Armee hochladen     │
│                              │  │                              │
│  [Havoc Dwarves  1500p  ✕]   │  │  ┌──────────────────────┐   │
│  [Tomb Kings     1490p  ✕]   │  │  │  PDF droppen oder    │   │
│  [Vampiric Undead 1500p ✕]   │  │  │  klicken zum Upload  │   │
│                              │  │  └──────────────────────┘   │
│  Klick zum Auswählen         │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘
```

- Gespeicherte Armee klicken → sofort geladen
- ✕ → aus Bibliothek löschen (mit Bestätigung)
- Neue Armee hochladen → automatisch in Bibliothek speichern
- In Library-Screen (Hauptmenü): alle Armeen verwalten, aufklappbare Einheitenlisten

### 1c. Basegröße-Dialog

**Wann:** Nach Army-Upload, vor Weiter zu Schritt 2, für jede Einheit die NICHT in `opr_unit_library` ist.

**Dialog zeigt:**
```
┌─────────────────────────────────────┐
│ Neue Einheit: Chaos Dwarf Warriors  │
│                                     │
│ Diese Einheit ist noch unbekannt.   │
│ Gib die Basegröße deiner Miniaturen │
│ ein. Wird einmalig gespeichert.     │
│                                     │
│ Basis Breite:  [25] mm              │
│ Basis Tiefe:   [25] mm              │
│ Formation:     [5] × [2]            │
│                                     │
│ Footprint: 4.9" × 1.97"             │
│                                     │
│ [Standard 25mm] [Cav 25×50mm]       │
│ [Monster 50mm]  [Large 40mm]        │
│                                     │
│            [Speichern →]            │
└─────────────────────────────────────┘
```

- Schnell-Buttons für häufige Basen: 25mm, 40mm, 50mm, 25×50mm
- Footprint wird live in Zoll berechnet: `(baseW × formW) / 25.4`
- Bei mehreren neuen Einheiten: nacheinander (Fortschritts-Anzeige "3 von 5")
- Gespeichert in localStorage `opr_unit_library`:
  ```javascript
  [{ name: 'Chaos Dwarf Warriors', bw: 25, bd: 25, fw: 5, fd: 2 }]
  ```

---

## 2. Spielfeld-Phasen (NEUE ARCHITEKTUR)

### Grundprinzip

Wenn das Spielfeld öffnet, gibt es **3 Pflicht-Phasen** bevor das Spiel beginnt.
Jede Phase hat:
- **Phasen-Banner** oben (goldener Rahmen, erklärender Text)
- **"Phase abschließen"** Button erst klickbar wenn Phase vollständig

```
[PHASE 1: TERRAIN] → [PHASE 2: OBJECTIVES] → [PHASE 3: DEPLOYMENT] → [SPIEL]
```

### 2a. Terrain-Phase

**Layout:**
- Spielfeld zentriert
- **Rechte Sidebar** (300px): Terrain-Bibliothek
  - Jedes Stück: Emoji-Icon + Name + Footprint in Zoll + Typ (Cover/Difficult/etc.)
  - Platzierte Stücke: ausgegraut mit ✓ oder verschiebbar
- **Toolbar:** "Terrain-Phase: X von 10+ Stücken gesetzt" + "Phase abschließen →"

**Drag & Drop:**
```
Sidebar → Spielfeld:
1. mousedown auf Terrain-Stück in Sidebar
2. Terrain-Geist folgt Maus (halbtransparent)
3. mouseup auf Spielfeld → Terrain erscheint
4. Unter dem Terrain: [✓] [✕] Buttons
5. Solange kein ✓: weitere Drag-Bewegung möglich
6. ✓ → fest (Buttons verschwinden, Terrain leuchtet kurz grün auf)
7. ✕ → Terrain verschwindet, taucht in Sidebar wieder auf
8. Bei festem Terrain: Hover → [✏️ Bearbeiten] erscheint → klick → wieder verschiebbar
```

**Terrain-Objekt auf Spielfeld:**
```javascript
{
  id: 't_1234',
  terrainLibId: 't1',      // Referenz auf Bibliothek
  name: 'Dense Forest',
  icon: '🌲',
  type: 'Difficult+Cover',
  x: 24.5,                  // Zentrum in Zoll
  y: 18.0,
  w: 4.0,                   // Breite in Zoll
  h: 3.0,                   // Tiefe in Zoll
  confirmed: false           // true nach ✓
}
```

### 2b. Objective-Phase

**Reihenfolge laut Regeln:**
1. Roll-off → Gewinner platziert ersten Marker
2. Abwechselnd bis alle D3+2 Marker gesetzt

**Spieler-Zug:**
- Cursor wird zu Crosshair
- Klick aufs Spielfeld → Objective-Marker erscheint (lila/golden)
- Marker zeigt Nummer
- Unter Marker: [✓] [✕]
- Validierung: außerhalb Deployment-Zonen (12"), 9"+ von anderen Markers
- Ungültige Position: roter Marker + Toast "Ungültig: zu nah an Objective 2"

**KI-Zug:**
- "KI platziert Objective..." Banner erscheint
- 1.5 Sekunden Pause (Spannung)
- Marker erscheint automatisch (6-Quadranten-Regel aus Solo Rules)
- Sofort bestätigt

### 2c. Deployment-Phase

**Layout:**
```
┌─────────────────┐  ┌──────────────────────┐  ┌─────────────────┐
│  DEINE EINHEITEN│  │                      │  │   KI EINHEITEN  │
│  (zu deployen)  │  │    SPIELFELD         │  │  (zu deployen)  │
│                 │  │                      │  │                 │
│  [Unit Block]   │  │  ┌───┐  ┌───┐       │  │  [Unit Block]   │
│  [Unit Block]   │  │  └───┘  └───┘       │  │  [Unit Block]   │
│  [Unit Block]   │  │                     │  │  [Unit Block]   │
│                 │  │  ═══════════════    │  │                 │
│                 │  │    (midline)         │  │                 │
└─────────────────┘  └──────────────────────┘  └─────────────────┘
```

**Einheiten-Blöcke in Sidebar:**
- Visuelles Rechteck, maßstabsgetreu zum Spielfeld (skaliert auf Sidebar-Breite)
- Gleiche Farbe/Stil wie auf dem Spielfeld
- Frontlinie oben (rot/blau)
- Einheitenname + Modellanzahl
- Qualität / Defense angezeigt
- **Klickbar und ziehbar** (Drag & Drop)

**Drag & Drop Deployment:**
```
Sidebar → Deployment-Zone:
1. Einheit aus Sidebar ziehen
2. Geist folgt Maus (transparent)
3. Deployment-Zone leuchtet auf wenn Maus drüber
4. Drop → Einheit erscheint auf Feld
5. Solange unbestätigt:
   - Weiter verschiebbar per Drag
   - Rotation-Buttons erscheinen: [↺45°] [↺90°] [↻90°] [↻45°]
   - Koordinaten-Badge unten links: "36.2" × 44.1""
   - [✓] [✕] Buttons unter Einheit
6. ✓ → fest, Rotation-Buttons verschwinden
7. ✕ → zurück in Sidebar
```

**KI Deployment:**
- KI-Einheit in rechter Sidebar leuchtet auf
- Bewegt sich (Animation) aufs Feld
- Erscheint in KI-Deployment-Zone
- Sofort bestätigt

**Reihenfolge:**
- Roll-off Ergebnis aus Schritt 8 des Wizards
- Toolbar zeigt: "Du bist dran — ziehe eine Einheit" oder "KI deployt..."
- Nach jeder platzierten Einheit: Seite wechselt

---

## 3. Spielmechaniken (bereits implementiert — nur Referenz)

Alle Kampfregeln, KI-Logik, Scoring etc. sind implementiert. Siehe STATUS.md für Details.

---

## 4. Technische Anforderungen

### Datei-Struktur (Empfehlung für Claude Code)

Das Projekt sollte aufgeteilt werden:
```
opr-simulator/
├── index.html          (Haupt-HTML, lädt alle anderen)
├── css/
│   ├── base.css        (Variablen, Grundstile)
│   ├── screens.css     (Screens, Wizard, Gameboard)
│   └── components.css  (Buttons, Cards, Modals)
├── js/
│   ├── state.js        (S-Objekt, Constants)
│   ├── api.js          (Anthropic API Calls)
│   ├── army.js         (Upload, Library, Base-Sizes)
│   ├── setup.js        (Wizard-Logik)
│   ├── terrain.js      (Terrain-Phase, Drag&Drop)
│   ├── objectives.js   (Objective-Phase)
│   ├── deployment.js   (Deployment-Phase)
│   ├── render.js       (Canvas, drawUnit, etc.)
│   ├── combat.js       (Melee, Shooting, Morale)
│   ├── ai.js           (KI-Entscheidungen, Lernprofil)
│   ├── spells.js       (Zauber-System)
│   ├── horde.js        (Horde Mode)
│   ├── missioncards.js (36 Mission Cards)
│   └── ui.js           (Toast, Modals, Navigation)
└── data/
    ├── special-rules.js (SR-Datenbank)
    └── spells.js        (Zauber-Listen)
```

### API-Calls — korrekte Headers

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [...]
  })
});
```

### localStorage Keys

```
opr_key              → API Key
opr_army_library     → gespeicherte Armeen []
opr_unit_library     → Basegrößen []
opr_terrain          → Terrain-Bibliothek []
opr_history          → Battle History []
opr_kiprofile_FACTION → KI-Lernprofil pro Fraktion
```

---

## 5. Design-System

### Farben
```css
--bg-void: #0a0806
--bg-deep: #110e0a
--bg-mid: #1a1410
--bg-surface: #231c15
--bg-raised: #2d2419
--gold-bright: #c9a84c
--gold-mid: #a07c32
--crimson: #8b1a1a
--crimson-bright: #c42b2b
--blue-unit: #1a3a5c
--blue-bright: #2a6099
--text-bright: #e8d9b5
--text-dim: #6b5030
```

### Fonts
- Display: `Cinzel Decorative` (Titel, Logos)
- Heading: `Cinzel` (Labels, Buttons, Stats)
- Body: `Crimson Text` (Beschreibungen, Log)

### Buttons
- Haupt-Button: `clip-path` entfernt (war Klick-Bug!), goldener Border
- Danger: roter Border
- Ghost: minimaler Style

---

## 6. Offene Fragen / Entscheidungen für Claude Code

1. **Einzel-HTML oder Multi-File?** → Multi-File empfohlen für Maintainability
2. **Drag & Drop Bibliothek?** → Vanilla JS reicht (kein jQuery/Sortable nötig)
3. **Canvas oder HTML für Deployment-Sidebars?** → HTML-Elemente für Sidebar, Canvas für Spielfeld
4. **Terrain-Größen** → aus Bibliothek fix, nicht veränderbar während Placement
