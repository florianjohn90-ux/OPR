# OPR Age of Fantasy: Regiments — Simulator
## Projektübergabe an Claude Code

---

## Was dieses Projekt ist

Ein vollständiger Browser-basierter Solo-Simulator für **One Page Rules: Age of Fantasy Regiments**.
- Einzelne HTML-Datei (`opr-simulator.html`, ~300KB, ~5400 Zeilen)
- Kein Server, kein Build-System — öffnet direkt im Browser
- Anthropic API Key wird im Browser gespeichert (localStorage)
- KI-Gegner wird über Claude API (`claude-sonnet-4-6`) gesteuert
- Physische Miniaturen unterstützt via Koordinaten-System

---

## Aktueller Stand

### ✅ Vollständig implementiert

**Core Systems:**
- API Key Management (Modal im Hauptmenü, localStorage)
- Army Upload (PDF via Claude API, JSON als Fallback)
- Army Library Konzept vorbereitet (noch nicht vollständig)
- Setup-Wizard (8 Schritte: Armies → Battlefield → Scenario → Rules → Play Mode → AI Profile → Terrain → Deployment)
- Spielfeld-Rendering (Canvas, Grid, Ruler, Deployment-Zonen)
- Unit-Rendering (Rechtecke mit Frontlinie, HP, Koordinaten-Badge)
- Drei Spielmodi: Digital / Hybrid-AI / Hybrid-Analog

**Kampfsystem:**
- Nahkampf: vollständige 4-Schritt Sequenz (Attacks → Hit → Block → Wounds)
- Schießen: Reichweite, LoS (45° Arc), Cover, AP
- Impact(X), Counter, Furious, Thrust, Fatigue
- Strike Back (nur bei Frontal-Charge)
- Melee Resolution (Wounds + Full Rows, Flank/Rear -1/-2)
- Konsolidierungsbewegungen nach Melee
- Morale: Shaken / Routed, Fearless reroll, Banner +1
- 3D Dice Bowl (Three.js)

**Regeln:**
- LoS: 45° Front-Arc, Blocking durch Einheiten
- Cover: +1 Defense beim Blocken
- Difficult Terrain: max 6" gesamt
- Dangerous Terrain: Tough-Wert Würfel
- 1" Trennungsregel
- Flanken/Rücken geometrisch berechnet
- Formation: 5er-Reihen (5/10 Modelle), 3er-Reihen (3/6 Modelle)

**Spezialregeln:**
- Vollständige SR-Datenbank mit Tooltips und Nested-Tooltips
- Command Groups: Sergeant, Musician, Banner
- Hero in Unit
- Ambush Units
- Combined Units

**KI-System:**
- 5 KI-Profile (Aggressor, Tactician, Iron Wall, Objective Master, Lightning Strike)
- D3-Sektions-System (Solo Rules)
- Kiting für Shooting-Einheiten
- Bevorzugt offene Ziele (nicht in Cover)
- Zauber-Entscheidungslogik
- Lernprofil (gespeichert per Fraktion in localStorage)

**Spielmodi:**
- Standard-Spiel (4 Szenarien aus Tournament Pack)
- Horde Mode (12 Wellen, XP-System, Traits, Objective-Schaden)
- Mission Cards (36 korrekte Karten aus PDF)

**Scoring:**
- Per-Round Objective Scoring (Szenarien 2 und 4)
- End-Game Scoring (Szenario 1)
- Objective-Kontrolle persistiert nach Wegbewegen
- Challenge Bonus

**Sonstiges:**
- Battle History (gespeichert in localStorage)
- Terrain Library (10 Default-Stücke)
- Unit Library (Basegrößen gespeichert)
- Game Log
- Toolbar: ← Menü, ⚑ Spiel beenden, AI Turn, etc.

---

### ⚠️ Implementiert aber fehlerhaft / unvollständig

**Army Upload — KRITISCH:**
- PDF-Parser schlägt oft fehl (CORS, API-Fehler)
- JSON-Parser erfindet Einheiten aus dem Armeenamen statt echte Daten zu lesen
  - Army Forge JSON enthält nur interne IDs, keine lesbaren Einheitennamen
  - Claude "halluziniert" plausible Einheitenlisten → **völlig falsche Armeen**
- Army Library existiert noch nicht (Armeen werden nicht gespeichert)
- Basegröße-Dialog existiert im HTML aber wird nie aufgerufen

**Deployment Phase:**
- Funktioniert grundsätzlich (Banner, Click-to-place)
- Aber: keine Drag & Drop Interaktion
- Keine visuellen Einheiten-Blöcke in Sidebars
- Terrain wird nicht interaktiv platziert
- Objectives werden nicht interaktiv platziert
- Reihenfolge nicht regelkonform sequenziell mit Phasen-Bannern

**Spielfeld beim Start:**
- Erscheint leer bis Deployment läuft
- Phase-Übergänge nicht klar kommuniziert

---

### ❌ Noch nicht gebaut

- Interaktive Terrain-Platzierung (Drag & Drop)
- Interaktive Objective-Platzierung (Click mit ✓/✕)
- Visuelles Deployment (Drag & Drop mit Einheiten-Previews)
- Army Library (speichern/laden/verwalten)
- Campaign Rules
- Spielstand speichern/laden
- Foto-Import für Terrain

---

## Bekannte Bugs

1. **JSON Army Upload zeigt falsche Einheiten** — Army Forge JSON hat keine lesbaren Namen, Claude erfindet sie
2. **PDF Upload manchmal fehlerhaft** — CORS-Probleme, API-Fehler nicht immer sichtbar
3. **Deployment ohne visuelles Feedback** — Einheiten erscheinen einfach auf dem Feld ohne Drag-Interaktion
4. **Basegröße-Dialog wird nie gezeigt** — saveBaseSetup() existiert aber wird nicht aufgerufen

---

## Technische Schulden

- Alle 5400 Zeilen in einer einzigen HTML-Datei → sollte aufgeteilt werden
- Viele Override-Ketten (function X → _origX → _p3origX) wurden konsolidiert aber Architektur ist fragil
- Kein automatisches Testing
- localStorage als einzige Persistenz (kein Export/Import von Spielständen)
