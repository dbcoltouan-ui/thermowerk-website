# Handoff — Thermowerk Heizlastrechner: Komplett-Redesign

> **Zweck dieses Dokuments:** Kompletter Kontext für eine **neue Claude-Session** zur Neugestaltung des internen Heizlast-Berechnungstools auf `thermowerk.ch/heizlast`. Die Berechnungslogik ist vorhanden und validiert. Design, UI und PDF-Exporte werden **von Grund auf neu gebaut** — der bestehende Rechner dient ausschliesslich als Referenz für Berechnungsinhalte, **nicht** als Designvorlage.

---

## 1. Auftrag

Den unter `/heizlast` integrierten Heizlastrechner auf **professionellem, Keynote-/PowerPoint-niveau** redesignen. Bisher wurde das originale Standalone-Tool (vanilla HTML/JS) 1:1 in Astro eingebettet und optisch mit CSS-Overrides angepasst. Das Ergebnis ist funktional, aber optisch eine „Wurst" — alles läuft in einer langen Liste ohne visuelle Hierarchie, der Benutzer verliert den Überblick. Zielbild: jede Sektion eine klar strukturierte Einheit, dezente Zwischenergebnisse während der Eingabe, **grosse Executive-Summary am Ende**, und Exporte auf Präsentations-Niveau.

---

## 2. Kritisch: Was der alte Rechner IST und NICHT IST

| | |
|---|---|
| **IST** | Quelle für Berechnungsformeln, Konstanten (FWS-Tabellen), Modul-Logik, Validierung, Cascade-Reihenfolge (M4→M3→M5→M6→M7→M8→M9) |
| **IST NICHT** | Designvorlage. Die bestehenden DOM-Strukturen, CSS-Klassen, Modulköpfe mit Badge und Accordion-Chevron, die Button-Leiste oben — alles davon ist **vollständig zu verwerfen**. |

Der neue Rechner orientiert sich **optisch an der bestehenden Thermowerk-Website** (`thermowerk.ch`), nicht am Desktop-Tool.

---

## 3. User-Profil und Kommunikation

- **Name:** Daniel Coltouan, Inhaber „Thermowerk" (Wärmepumpen-Planung, Schweiz)
- **Technikniveau:** Kein Entwickler. Er besucht FWS-Kurse, kann aber Rechengänge oft nicht spontan nachvollziehen.
- **Sprache:** Schweizer Deutsch. CHF mit Hochkomma (`1'000'000`). Ortsbezug Mittelland/Höhe.
- **Antwortstil (strikt):**
  - **Knapp.** Keine Task-Listen nach Erledigung. Keine „Ich habe folgendes gemacht:"-Aufzählungen.
  - Listen/Tabellen nur wenn inhaltlich nötig.
  - **Keine Formeln** im Chat, ausser gefragt.
  - Bei Unsicherheit **fragen, nicht raten** („schau mal wo der Haken ist, und gib mir Bescheid bevor du was änderst" — O-Ton).
  - `AskUserQuestion` nutzen wenn Auswahlmöglichkeiten bestehen.
- **Tonalität der UI & Exporte:** professionell, seriös, schweizerisch-präzise. Keine Emojis in UI-Texten (ausser funktionalen Icons wie ☁ für Cloud). Keine „Du"-Anrede im Tool.

---

## 4. Projekt-Kontext (Website)

**Stack:** Astro 5.5 · Cloudflare Pages (auto-deploy via GitHub Push) · Sanity CMS (Project ID `wpbatz1m`, Dataset `production`). Siehe `CLAUDE.md` im Projektordner für die vollständigen Architektur-Details der Website.

**Design-System der Website (muss konsistent übernommen werden):**
- Navy `#1B2A4A`, Navy-dark `#111D33`, Navy-light `#243658`
- Akzent-Rot `#D93025`, Hover `#B71C1C`
- Weiss `#FFFFFF`, Off-White `#F7F8FA`, Light-Gray `#EEF0F4`, Border `#E2E5EB`
- Blue-tint `#E8EDF5` (dezent für Info-Boxen)
- Mid-Gray `#6B7280`, Dark `#1A1A1A`
- Fonts: **Outfit** (Headings, 400–800), **DM Sans** (Body, 400–700), **Montserrat** (Nav, 500)
- Buttons: Outfit 600, Border-Radius 6px, 2px Border
- Sektionen: `padding: clamp(60px, 10svh, 100px) 0`
- `container`: `max-width: 1120px; margin: 0 auto; padding: 0 clamp(16px, 3vw, 24px)`

Der neue Heizlastrechner muss sich sofort als „Teil von Thermowerk" erkennen lassen — gleiche Typografie, gleiche Farbpalette, gleiche Spacing-Regeln, gleiche Button-Sprache.

**Inspirations-Quellen** (der neue Claude sollte sich daran orientieren, nicht am alten Rechner):
- `src/components/Services.astro`, `Wpsm.astro`, `Steps.astro`, `About.astro` — Sektion-Pattern
- `src/components/Calculator.astro` — wie Rechner-ähnliche UI bei Thermowerk aussieht
- `src/layouts/Layout.astro` — komplette CSS-Grundlage (Variablen, Buttons, Sektionen)

---

## 5. Design-Entscheidungen (vom User final gewählt)

| Thema | Entscheidung |
|---|---|
| **Visuelle Richtung** | Technisch-klar, aber nicht überladen. Jede Sektion klar strukturiert, Wichtiges sofort erkennbar. Kein Dashboard-Overkill, aber auch kein Magazin-Flair. |
| **Struktur** | Einfach zu bedienen, **aufklappbare Info-Boxen pro Sektion** („Was ist das?", „Abkürzungen erklärt") mit ansprechendem visuellem Design. |
| **Zwischenergebnisse** | Während der Bearbeitung **dezent** in der jeweiligen Sektion sichtbar (nicht als dominante Hero-Werte). |
| **Executive Summary** | Am **Ende** des Rechners eine eigene, grosse Abschluss-Sektion mit allen Resultaten und Aufschlägen aus den Sektionen. |
| **PDF-Exporte** | **Keynote/PowerPoint-Niveau.** Mehrseitig, Deckblatt, pro Thema eine „Folie" mit Hero-Grafik/Tabelle, Annotationen, Firmen-CI, Seitenzahlen. |
| **Export-Varianten** | **Eine einheitliche Export-Funktion** mit Checkbox „Formeln und Rechenwege einbeziehen". Kein Kunde/Intern-Split mehr im Button — der User entscheidet beim Export. |
| **Logo** | **Fest eingebaut** (aus Sanity `siteSettings` oder `/img/logo.png`), kein Upload-Button im UI. |
| **Speichervolumen** | Auf **5- oder 10-Liter-Schritte gerundet** (nie krumme Werte wie „187 L" — stattdessen „190 L"). |

---

## 6. Informations-Architektur (neue Sektions-Struktur)

Die Module werden **inhaltlich neu gruppiert** (nicht mehr M1–M9 nebeneinander, sondern logische Phasen):

```
┌─ 1. HERO / EINSTIEG
│   Titel, Kurzbeschreibung, Projekt-Management (Laden / Speichern / Neu / JSON)
│
├─ 2. GEBÄUDE & STANDORT   ← (alter M1)
│   Gebäudetyp, Lage, Bauperiode, EBF, Wohneinheiten, tvoll
│   Info-Box aufklappbar: „Was ist EBF?", „Was ist tvoll?"
│   Live-Werte: tvoll-Wert
│
├─ 3. HEIZLAST-BERECHNUNG  ← (alter M2 + M4 + M3)
│   Methoden-Auswahl (Verbrauch/Messung/Bstd/Bauperiode/Override)
│   Optional: Sanierungs-Delta (M4), Plausibilität (M3)
│   Info-Box: FWS-Referenz, Plausibilitätsband
│   Live-Werte: Qhl_raw (aus M2), Qhl_korr (nach M4), W/m² (M3 mit Farbband grün/gelb/rot)
│
├─ 4. WARMWASSER           ← (alter M5)
│   Personen/direkt/Messung + Verluste
│   Info-Box: SIA 385/1
│   Live-Werte: Qw (kW), QwwTag (kWh/d)
│
├─ 5. ZUSCHLÄGE            ← (alter M6)
│   Sperrzeit, Qas
│   Info-Box: Warum Sperrzeit-Zuschlag?
│   Live-Werte: Qoff
│
├─ 6. WP-AUSLEGUNG         ← (alter M7)
│   Qh = Qhl + Qw + Qoff + Qas
│   Grosse Ergebnis-Box: finale Auslegungsleistung, Bauteil hervorgehoben
│
├─ 7. SPEICHER             ← (alter M8 + M9 kombiniert, als „Speicher-Paket")
│   WW-Speicher (FWS §10/§11)    → gerundet auf 10-L-Schritte
│   Heizungs-Pufferspeicher      → gerundet auf 10-L-Schritte
│   Info-Box: SWKI BT 102-01, VDI 4645
│   Visuell als ZWEI parallele „Karten" nebeneinander, nicht untereinander
│
├─ 8. LEISTUNGSDIAGRAMM    ← (bisheriges M10)
│   Bivalenzpunkt, Chart.js
│   Info-Box: Wie lese ich das Diagramm?
│
└─ 9. EXECUTIVE SUMMARY (neu!)
    Grosse Abschluss-Sektion:
    • 4 Hero-KPI-Kacheln in Reihe (Qhl · Qh · V-WW · V-Puffer)
    • Tabelle aller Zwischenergebnisse mit Aufschlüsselung
    • Stacked-Bar-Visualisierung „Qh = Qhl + Qw + Qoff + Qas"
    • Projekt-Metadaten (Datum, EBF, Gebäudetyp, Bauperiode) kompakt
    • Export-CTA-Button
```

---

## 7. Sektions-Gestaltung (Detail)

Jede Sektion folgt dem gleichen Aufbau-Muster (wie auf thermowerk.ch):

```
┌─────────────────────────────────────────────────────┐
│ SEKTION-LABEL (rot, caps, letter-spacing, 14px)     │  ← wie `.section-subtitle` auf Website
│                                                     │
│ Grosse Überschrift in Outfit 700 (28–40px)          │  ← wie h2 auf Website
│ Optionale Subline in Outfit 500 mid-gray            │  ← wie `.section-subheading`
│                                                     │
│ [ ℹ︎ Was ist das? ]  ← aufklappbar, Blue-tint BG    │
│                                                     │
│ ┌─ EINGABEFELDER ─────────────────────────────┐    │
│ │ In Grid-Layout, grosszügig, beschriftet     │    │
│ └──────────────────────────────────────────────┘    │
│                                                     │
│ ┌─ ZWISCHEN-ERGEBNIS ─────────────────────────┐    │
│ │ Dezenter Off-White-Block mit 2-3 KPIs       │    │
│ │ klein, aber deutlich lesbar, nicht „hero"   │    │
│ └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Abstände zwischen Sektionen:** `clamp(60px, 10svh, 100px)` vertikal (analog `.section-padding` der Website). Abwechselnd Hintergrund `--white` und `--off-white` wie bei Services/About.

---

## 8. Executive Summary (das Finale)

Hier soll der „Wow"-Moment stattfinden. Vorschlag für Aufbau:

```
╔══════════════════════════════════════════════════╗
║                                                  ║
║  AUSLEGUNG                                       ║
║  ────────                                        ║
║  Wärmepumpen-Dimensionierung für                 ║
║  [Projektname] · [Adresse]                       ║
║                                                  ║
║  ┌─────────┬─────────┬─────────┬─────────┐       ║
║  │  Qhl    │  Qh     │  V-WW   │  V-Puff │       ║
║  │ 8.43 kW │ 9.50 kW │  300 L  │  190 L  │       ║
║  └─────────┴─────────┴─────────┴─────────┘       ║
║                                                  ║
║  ┌─ ZUSAMMENSETZUNG Qh ─────────────────┐        ║
║  │ ██████████████████ Qhl  8.43 kW      │        ║
║  │ ████ Qw                 0.70 kW       │        ║
║  │ ██ Qoff                 0.37 kW       │        ║
║  │ (horizontaler Stacked-Bar)            │        ║
║  └───────────────────────────────────────┘        ║
║                                                  ║
║  ┌─ OBJEKTDATEN ───┬─ RESULTATE IM DETAIL ┐      ║
║  │ Gebäudetyp: EFH │ Qhl_raw:    8.80 kW  │      ║
║  │ Bauperiode:...  │ Sanierung:  -0.37 kW │      ║
║  │ EBF: 129.9 m²   │ W/m²:       65       │      ║
║  │ tvoll: 2000 h   │ Bivalenz:   -5.2 °C  │      ║
║  └─────────────────┴──────────────────────┘      ║
║                                                  ║
║  [ M10 Leistungsdiagramm eingebettet ]           ║
║                                                  ║
║  [ ALS PDF EXPORTIEREN ▼ ]                       ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

Diese Sektion ist gleichzeitig die „Folie 1" beim PDF-Export — sie wird identisch als erste Deckblatt-Seite gedruckt.

---

## 9. Export: Einheitlich mit Toggle

**Ein einziger Export-Button** (statt bisher „PDF Kunde" / „PDF intern" / „PDF Export").

Beim Klick öffnet sich ein Modal:

```
┌─ EXPORT ─────────────────────────────────────┐
│                                              │
│ Dateiname: [Thermowerk-Heizlast-...]         │
│                                              │
│ Inhalt:                                      │
│   ☑ Executive Summary (Deckblatt)           │
│   ☑ Objektdaten & Eingabewerte               │
│   ☑ Resultate pro Sektion                    │
│   ☐ Formeln und Rechenwege                   │  ← User-Entscheidung
│   ☑ Leistungsdiagramm (M10)                  │
│   ☑ Berechnungsgrundlagen (FWS/SIA)          │
│                                              │
│ Format: ⦿ PDF   ○ JSON                       │
│                                              │
│       [ ABBRECHEN ]  [ ▼ EXPORTIEREN ]      │
│                                              │
└──────────────────────────────────────────────┘
```

**PDF-Qualitätsanspruch (Keynote-Niveau):**
- A4 Hochformat, Seitenrand 20mm
- Deckblatt: Logo oben links, Dokumenttitel zentriert, Projekt-Meta rechts, am Fuss FWS-Hinweis
- Pro Sektion eine „Folie" mit: Sektion-Label (rot, caps), Überschrift, Haupt-Inhalt (Tabelle ODER Grafik ODER Key-Value-Liste), Fussnote mit Quelle
- Seitenzahlen unten rechts („Seite X von Y")
- Farbakzente: Navy für Headings, Rot nur für Akzente (Hero-KPIs, Labels)
- Typografie im PDF: Outfit für Headings, DM Sans für Body, **11pt** Fliesstext (nicht kleiner!)

Implementations-Ideen:
- **Print-CSS** mit `@page`-Regel für Seitenränder, `page-break-after: always` für Folien-Gefühl
- Oder `jsPDF` + `html2canvas` für pixelgenaue Kontrolle
- Oder serverseitig via Cloudflare Pages Function mit Puppeteer (overkill, aber maximale Qualität)

**Empfehlung:** Beim Start mit Print-CSS arbeiten (schneller), bei Bedarf auf `jsPDF`+`html2canvas` upgraden.

---

## 10. Auth / Login

**Unverändert funktional**, aber visuell redesignt:
- `/api/heizlast-auth` (vorhanden, funktioniert) — POST Passwort, setzt HttpOnly-Cookie
- `/api/heizlast-projects` (vorhanden, funktioniert) — GET/POST/DELETE Cloud-Projekte in Sanity
- `HEIZLAST_PASSWORD` als Cloudflare Env Var gesetzt

**UI-Anforderung:**
- Login-Button **rechts oben**, dezent, klein, als `🔒 Login` (oder nur Icon auf Mobile)
- Klick → Modal im Thermowerk-Design (wie `src/components/Contact.astro` Formular)
- Nach Login: erweiterte Features sichtbar via `body.is-auth`-Klasse:
  - Cloud-Projekte Dropdown statt nur localStorage
  - Cloud speichern Button
  - Angebots-Template für PDF-Export freigeschaltet
  - Abmelden-Button

**Datenschutz:** Externe Nutzer sehen NIE Sanity-Projekte (cookie-geschützt), ihre localStorage bleibt im eigenen Browser.

---

## 11. Datei-Struktur (Zielbild)

### Zu ERSETZEN / LÖSCHEN
```
src/pages/heizlast.astro                    ← komplett neu
public/tools/heizlast/heizlast-tw.css       ← löschen (CI-Overrides obsolet)
public/tools/heizlast/heizlast-cloud.js     ← löschen (wird in Astro-Komponenten integriert)
public/tools/heizlast/heizlast-chart.js     ← löschen (wird Astro-Komponente)
public/tools/heizlast/bundle.js             ← löschen (wird nicht mehr als Ganzes geladen)
public/tools/heizlast/style.css             ← löschen (Tool-CSS obsolet)
```

### BLEIBT UNVERÄNDERT (funktioniert)
```
sanity/schemas/heizlastProject.ts           ← Schema passt
sanity.config.ts                            ← Sidebar-Eintrag passt
functions/api/heizlast-auth.js              ← funktioniert
functions/api/heizlast-projects.js          ← funktioniert
public/img/logo.png                         ← Firmen-Logo
```

### NEU ZU ERSTELLEN (Vorschlag)
```
src/pages/heizlast.astro                    ← neue Haupt-Seite
src/layouts/HeizlastLayout.astro            ← eigenes Layout für den Rechner (ähnlich Layout.astro aber ohne Site-Nav)
src/components/heizlast/
  ├─ HeizlastHero.astro                     ← Einstieg
  ├─ Section1Gebaeude.astro                 ← Gebäude & Standort
  ├─ Section2Heizlast.astro                 ← Heizlast-Berechnung (inkl. Sanierung + Plausi)
  ├─ Section3Warmwasser.astro               ← WW
  ├─ Section4Zuschlaege.astro               ← Sperrzeit, Qas
  ├─ Section5Auslegung.astro                ← Qh Ergebnis
  ├─ Section6Speicher.astro                 ← WW-Speicher + Pufferspeicher
  ├─ Section7Diagramm.astro                 ← Chart.js Leistungsdiagramm
  ├─ ExecutiveSummary.astro                 ← Finale
  ├─ InfoBox.astro                          ← wiederverwendbare aufklappbare Info-Box
  ├─ KpiCard.astro                          ← wiederverwendbare KPI-Kachel
  ├─ LoginModal.astro                       ← Login-Dialog
  └─ ExportModal.astro                      ← Export-Dialog
src/lib/heizlast/
  ├─ calculations.ts                        ← Pure Rechenfunktionen (Port von js/heizlast.js)
  ├─ constants.ts                           ← FWS-Tabellen (Port von js/constants.js)
  ├─ state.ts                               ← State-Management (Svelte Store / Nano Stores / simple)
  ├─ storage.ts                             ← localStorage + Sanity-Sync
  └─ types.ts                               ← TypeScript-Typen
src/styles/heizlast.css                     ← optional separates Stylesheet
public/tools/heizlast/img/logo.png          ← kopie für Print
```

**Technologie-Empfehlung:**
- Astro mit **Nano Stores** (`@nanostores/astro`) für State-Management — leichtgewichtig, funktioniert in vanilla JS Islands
- Oder reines Vanilla-JS mit einem einfachen Observer-Pattern (wenn Nano Stores zu viel Overhead)
- **Keine** React/Vue/Svelte — würde die bestehende Website-Struktur brechen
- Chart.js weiterhin via CDN für M10

---

## 12. Berechnungs-Logik: Referenz-Quellen

**Alle relevanten Dateien liegen im Projekt selbst** unter `reference/old-calculator/` — der neue Claude muss nicht auf den Desktop zugreifen.

```
reference/old-calculator/
├── CLAUDE-HANDOFF.md             ← KRITISCH: Domäne-Wissen, Bug-Fixes, tvoll-Logik, WW-Abzug
├── index-reference.html          ← Original-HTML-Gerüst (nur als DOM-Struktur-Referenz)
├── style-reference.css           ← Original-CSS (NICHT als Designvorlage — nur Inspiration für Print-CSS)
└── js/
    ├── heizlast.js               ← REINE RECHENFUNKTIONEN: qhlAusQn, qwuTag, speichervolumen,
    │                                puffer_abtau, etc. → nach `src/lib/heizlast/calculations.ts` portieren
    ├── constants.js              ← FWS-Tabellen (Vollbetriebsstunden, Bauperioden-Kennwerte,
    │                                WW-Standards, fsto, Heizpuffer) → nach `src/lib/heizlast/constants.ts`
    ├── app.js                    ← Orchestrator: Cascade-Reihenfolge, Projekt-Management, Print-Logik
    ├── ui.js                     ← DOM-Helper (el, $, $$, toast) — im neuen Design nicht nötig
    ├── storage.js                ← localStorage-Pattern (Referenz, nicht 1:1 übernehmen)
    ├── tests.js                  ← vorhandene Tests — als Basis für neue Tests nutzen
    └── modules/
        ├── m1-stammdaten.js      ← M1: Gebäude & Standort (Logik extrahieren, UI neu)
        ├── m2-heizlast.js        ← M2: 5 Methoden-Tabs, Energieträger-Abzug
        ├── m3-plausibilitaet.js  ← M3: W/m²-Plausibilitätsband
        ├── m4-sanierung.js       ← M4: Multiplikativer Sanierungs-Delta
        ├── m5-warmwasser.js      ← M5: WW-Berechnung (Personen/direkt/Messung)
        ├── m6-zuschlaege.js      ← M6: Sperrzeit-Zuschlag, Qas
        ├── m7-wp-auslegung.js    ← M7: Qh = Qhl + Qw + Qoff + Qas
        ├── m8-speicher.js        ← M8: WW-Speicher nach FWS §10/§11
        └── m9-heizpuffer.js      ← M9: Heizpuffer (SWKI BT 102-01, VDI 4645)
```

**Nochmals wichtig:** `reference/old-calculator/CLAUDE-HANDOFF.md` enthält kritisches Domäne-Wissen zu Bugs und Fallstricken (z.B. tvoll-Entkopplung von der WP-macht-WW-Frage, WW-Abzug bei Öl-Kessel mit Durchlauferhitzer) — **zwingend lesen** bevor die Rechenlogik portiert wird.

**Wichtig zur Porting-Strategie:**
- Die Dateien in `js/modules/` enthalten **UI-Logik und Berechnungs-Logik vermischt**. Nur die Rechenteile extrahieren, die UI komplett neu bauen.
- Die Datei `js/heizlast.js` ist bereits nahe an pure Functions — einfacher Port nach TypeScript.
- `js/constants.js` ist eine reine Datensammlung — direktes Port möglich.
- Der Original-Ordner auf dem Desktop (`C:\Users\Daniel\Desktop\thermowerk-heizlast\`) ist der **Ground Truth** falls es Unstimmigkeiten gibt, aber für den Redesign nicht zwingend nötig.

### Regressions-Test (Pflicht!)

Nach dem Porten muss dieser Test passieren: **FWS-Aufgabe 2 → `Qhl = 12.55 kW`.**

Testcase (aus dem originalen Projekt):
```
Gebäudetyp: EFH, Lage: Mittelland, tvoll: 2000 h (auto)
Bauperiode: 1971–1980, EBF: 180 m²
Methode: Verbrauch
Energieträger: Heizöl EL, 3'200 L/a, inkl. WW = ja, Vw,u = 200 L/d
η = 0.80
→ erwartet: Qhl = 12.55 kW
```

---

## 13. Deploy-Pipeline

```
Änderungen committen → git push main → Cloudflare Pages Auto-Build (1–3 Min)
Bei Schema-Änderungen zusätzlich:  npx sanity deploy
```

Cloudflare-Env-Vars (schon gesetzt, Production):
- `SANITY_API_TOKEN` (Editor-Token)
- `SANITY_PROJECT_ID` = `wpbatz1m`
- `SANITY_DATASET` = `production`
- `HEIZLAST_PASSWORD` = (vom User gesetzt)
- `WEB3FORMS_KEY` (für Kontaktformular, nicht relevant hier)

---

## 14. Bekannte Fallstricke

1. **CSS-Kaskade in Astro:** `<style>` ist scoped. Für globale Regeln `<style is:global>` verwenden.
2. **Astro Scoped Styles erreichen keine Child-Komponenten** — komponentenübergreifend nur via globalem Layout-CSS.
3. **Google Fonts Timing:** DOM-Messungen erst nach `document.fonts.ready`.
4. **Cloudflare 1106:** Pages Functions können keine Requests an andere CF-geschützte Domains senden (irrelevant für Heizlast, aber gut zu wissen).
5. **Commit-Messages:** immer via `write_file("commitmsg.txt", "...")` + `git commit -F commitmsg.txt` (siehe CLAUDE.md).
6. **Git-Pfad auf Windows:** `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`, Shell `cmd`.
7. **Sanity Studio Deploy:** `npx sanity deploy` im Projektordner, nicht `sanity deploy` global.
8. **CLAUDE.md** im Projektordner enthält die vollständige bestehende Website-Architektur — **zuerst lesen**.

---

## 15. Qualitäts-Leitplanken

- **Mobile-First:** Jede Sektion muss auf 375px Breite einwandfrei bedienbar sein. Testen mit Chrome DevTools iPhone-Simulation.
- **Accessibility:** Alle Inputs haben Labels, Modals haben `aria-modal` und Fokus-Management, Kontraste ≥ WCAG AA.
- **Performance:** Keine unnötigen JS-Bundles. Chart.js und allfällige weitere Libs lazy-loaden.
- **Type-Safety:** TypeScript für die `src/lib/heizlast/`-Files.
- **Testbarkeit:** Rechenfunktionen als pure Funktionen, separat testbar.

---

## 16. Erste Aktionen für neuen Claude

1. **Dieses Dokument vollständig lesen.**
2. `CLAUDE.md` im Projekt-Root lesen (allgemeine Website-Architektur).
3. `reference/old-calculator/CLAUDE-HANDOFF.md` lesen (Domäne-Wissen, FWS-Regeln, Bug-Historie).
4. Den bestehenden Thermowerk-Website-Code sichten: `src/layouts/Layout.astro`, `src/components/Calculator.astro`, `src/components/Services.astro`, `src/pages/index.astro`. So wird klar wie die CI-Sprache aussieht.
5. `reference/old-calculator/index-reference.html` und eine Modul-Datei (z.B. `js/modules/m2-heizlast.js`) überfliegen — genug um zu verstehen was der Rechner inhaltlich leistet.
6. **Plan vorschlagen**, bevor mit der Umsetzung begonnen wird. Nicht in die Implementierung stürzen ohne Sign-Off vom User.
7. Bei Design-Entscheidungen: niemals alleine entscheiden, immer `AskUserQuestion` mit 2–3 Vorschlägen (inkl. Preview-Beschreibungen).
8. Antworten knapp halten.

---

## 17. Zusammenfassung für den Einstieg

> „Das Backend und die Daten-Infrastruktur stehen (Sanity-Schema, Cloudflare Functions, Auth, Env-Vars). Deine Aufgabe ist der **komplett neue Frontend-Aufbau** für `/heizlast`: Rechenlogik vom alten Tool portieren, UI in sauberer Astro-Komponenten-Architektur von Grund auf neu bauen, visuell konsistent zur bestehenden Thermowerk-Website, mit grosser Executive-Summary-Sektion am Ende und einem einheitlichen PDF-Export auf Keynote-Niveau."

---

*Erstellt: 2026-04-16 · Version 1.0*
