# Projekt-Übergabe an Claude — Thermowerk Heizlast

> **Zweck dieses Dokuments:** Kontext für eine neue Chat-Session. Daniel (User) arbeitet seit mehreren Sessions an einem Heizlastberechnungs-Tool auf Basis von FWS Modul 3.

---

## 1. User-Profil und Kommunikation

- **Name:** Daniel, arbeitet als Wärmepumpen-Planer (eigene Firma "Thermowerk")
- **Technikniveau:** Kein Entwickler. Hat den FWS-Kurs besucht, aber keine Routine in den Berechnungen. Lässt die Implementierung vollständig von Claude machen.
- **Sprache:** Deutsch (Schweizer Kontext — "Mittelland", CHF-Schreibweisen mit Hochkomma).
- **Antwortstil (wichtig!):**
  - **Knappe Antworten**, keine Aufzählung erledigter Tasks.
  - Listen/Tabellen nur wenn sinnvoll, nicht als Deko.
  - **Keine Formeln wenn nicht gefragt** — Daniel versteht Rechengänge oft nicht auf Anhieb.
  - Bei Auswahlmöglichkeiten: AskUserQuestion tool nutzen.
  - Bei Unsicherheit NICHT stillschweigend Fix, sondern zuerst fragen ("schau mal wo der Haken ist, und gib mir Bescheid bevor du was änderst" — O-Ton Daniel).

---

## 2. Projekt

**Thermowerk Heizlast** — Vanilla HTML/CSS/JS-Tool (PWA-fähig), gebündelt per esbuild zu einer **standalone HTML-Datei** die per `file://` läuft. Ziel: Heizlastberechnung für Wärmepumpen-Auslegung nach schweizerischen Normen.

**Normgrundlagen:**
- FWS Modul 3, Ausgabe 1-2025 (Schweizer Wärmepumpen-Fachvereinigung) — Hauptreferenz
- SIA 384/1:2022 (Heizlast in Gebäuden)
- SIA 385/1:2020 und 385/2 (Warmwasser)
- Für Heizpuffer (nicht FWS): SWKI BT 102-01, VDI 4645

---

## 3. Datei- und Ordnerstruktur

**Projekt-Root:** `/sessions/exciting-brave-ride/mnt/Desktop/thermowerk-heizlast/`

```
thermowerk-heizlast/
├── Thermowerk-Heizlast.html   ← Standalone-Datei für Daniel (User öffnet diese)
├── index.html                  ← Entwicklungs-Einstieg
├── bundle.js                   ← esbuild-Output (IIFE)
├── package.json, node_modules/
├── css/style.css               ← Inkl. Print + Kunden-Report-Layout
├── img/logo.png                ← Firmenlogo, als Base64 in standalone eingebettet
└── js/
    ├── app.js                  ← Orchestrator, Print-Funktionen, Projekt-I/O
    ├── constants.js            ← FWS-Tabellen (Vollbetriebsstunden, Bauperioden, WW-Standards, fsto, Heizpuffer)
    ├── heizlast.js             ← Reine Rechenfunktionen (qhlAusQn, qwuTag, speichervolumen, puffer_abtau, …)
    ├── ui.js                   ← DOM-Helper (el, bindInputs, $, $$, toast)
    ├── storage.js              ← localStorage-Projekte, JSON-Export/Import
    └── modules/
        ├── m1-stammdaten.js
        ├── m2-heizlast.js      ← 5 Methoden-Tabs: Verbrauch/Messung/Bstd/Bauperiode/Override
        ├── m3-plausibilitaet.js
        ├── m4-sanierung.js     ← Multiplikativ auf qhlRaw
        ├── m5-warmwasser.js    ← Personen/direkt/Messung + Verluste
        ├── m6-zuschlaege.js    ← Qoff Sperrzeit
        ├── m7-wp-auslegung.js  ← Qh = Qhl + Qw + Qoff + Qas
        ├── m8-speicher.js      ← WW-Speicher nach FWS §10/§11
        └── m9-heizpuffer.js    ← Heizpuffer (nicht FWS — SWKI/VDI/Hersteller)
```

**Build-Skripte:**

```bash
# Bundle neu bauen
cd /sessions/exciting-brave-ride/mnt/Desktop/thermowerk-heizlast
npx --yes esbuild js/app.js --bundle --format=iife --outfile=bundle.js

# Standalone HTML erzeugen (inlined CSS + JS + Logo als Base64)
python3 <<'PY'
import re, base64, pathlib
base = pathlib.Path('.')
html = (base/'index.html').read_text(encoding='utf-8')
css  = (base/'css/style.css').read_text(encoding='utf-8')
js   = (base/'bundle.js').read_text(encoding='utf-8')
logo_b64 = base64.b64encode((base/'img/logo.png').read_bytes()).decode()
logo_uri = f"data:image/png;base64,{logo_b64}"
html = html.replace('<img id="print-logo" alt="" />',
                    f'<img id="print-logo" alt="Logo" data-default="{logo_uri}" src="{logo_uri}" />')
html = html.replace('<link rel="stylesheet" href="css/style.css" />', '<style>\n'+css+'\n</style>')
html = re.sub(r'\s*<link rel="manifest"[^>]*/?>', '', html)
html = re.sub(r'\s*<link rel="icon"[^>]*/?>', '', html)
for needle in ['<script type="module" src="js/app.js"></script>',
               '<script src="js/app.js"></script>',
               '<script type="module" src="bundle.js"></script>',
               '<script src="bundle.js"></script>']:
    html = html.replace(needle, '__INLINE__')
html = re.sub(r'<script[^>]*src=[^>]+></script>', '__INLINE__', html)
html = html.replace('__INLINE__', '<script>\n'+js+'\n</script>', 1)
html = html.replace('__INLINE__', '')
(base/'Thermowerk-Heizlast.html').write_text(html, encoding='utf-8')
print('OK', len(html))
PY
```

**Regressions-Test** (JSDOM, prüft dass Aufgabe 2 aus FWS-Referenz Qhl = 12.55 kW liefert):

```bash
cd /sessions/exciting-brave-ride
node test-aufgabe2.mjs
```

---

## 4. Zentrale Konzepte (für neuen Claude wichtig)

### 4.1 tvoll-Logik (Vollbetriebsstunden)

**Kritisch — hier gab's Bugs.** Die korrekte Logik:

- `qhl = Qn,H / tvoll` — tvoll **immer** aus `wohnen_ohneWW` (2000 h Mittelland, 2300 h Höhe), Büro separat.
- WW-Energie wird **separat als Qw-Zuschlag in M5** berechnet, niemals über tvoll.
- M1 hat ein Feld "WP macht Warmwasser?" — das steuert **nur M5** (ob Qw gerechnet wird), **nicht tvoll**.
- M1 hat zusätzlich **manuellen tvoll-Override** (Dropdown auto/manuell).

### 4.2 WW-Abzug (häufiger User-Fehler)

Wenn der bestehende Energieträger WW mitproduziert (z. B. Öl-Kessel mit Durchlauferhitzer), muss in M2 der Schalter **"Verbrauch inklusive Warmwasser = ja"** gesetzt UND das Feld **VW,u (l/d)** ausgefüllt werden. Sonst wird der WW-Anteil fälschlich als Heizenergie gerechnet → Qhl zu hoch. Das Tool warnt via M3 (Plausibilitätsband 40–70 W/m² wird rot).

### 4.3 Cascade-Pattern

Onstate änderungen werden kaskadierend durchgereicht: M4 → M3 → M5 → M6 → M7 → M8 → M9. Guard `_cascading` in `app.js` verhindert Rekursion. Jeder Modul-Body exponiert `_recompute()` via `body._recompute = recompute`.

### 4.4 State-Shape

```js
state = {
  m1: { gebaeudetyp, lage, wpMachtWW, ebf, bauperiode, wohneinheiten, tvollModus, tvollManuell, tvoll },
  m2: { methode, traeger[], inklWW, vwuFuerAbzug, verlusteFuerAbzug, qnMess, … },
  m4: { aktiv, auswahl{id: {enabled, prozent}} },
  m5: { aktiv, methode, einheiten[], vwuDirekt, qnwwMess, verluste },
  m6: { toff, qas }, m8: {…}, m9: {…}, m7: {…},
  _last:          { qhl, qhlRaw, qnH, qnWW },   // aus M2, ggf. M4-korrigiert
  _lastWW:        { vwu, qwuTag, qwwTag, qnwwJahr }, // aus M5
  _lastQw:        { qw, td } | null,
  _lastZuschlaege:{ qoff, qas },
  _lastQh:        { qh },
  _projectName:   string | undefined,
}
```

### 4.5 Print-Modi

- **PDF intern** (`doPrint('intern')`) — alle Module inkl. Rechenwege (`details.steps` werden geöffnet).
- **PDF Kunde** (`doPrint('kunde')`) — ersetzt DOM durch ein Angebots-Template (`buildKundenReport()` in app.js), das via `body.print-kunde > body > *:not(.kunden-report)` alles andere hart ausblendet.
- Im Druckdialog **muss der User manuell "Kopf-/Fusszeilen"** abwählen (URL-Footer lässt sich per CSS nicht erzwingen — nur Browser-Setting). Toast-Hinweis ist eingebaut.

### 4.6 Logo

`img/logo.png` wird beim Build als Base64 in das `<img id="print-logo" data-default="…">` eingebettet. User kann zusätzlich via "Logo"-Button eigene Datei hochladen (wird in `localStorage['thermowerk_logo']` gespeichert).

---

## 5. Was NICHT im Tool drin ist (Grenzen)

- **Heizungs-Leitungsverluste** (unisolierte Keller-Rohre). Empfehlung an User: via η absorbieren (0.75 statt 0.80 bei schlechter Isolation).
- **WW-Leitungsverluste bekannter Länge** (0.12/0.15 kWh/m·d nach SIA 385/2) — muss manuell in % umgerechnet und als Zirk-Verlust eingetragen werden.
- **Raumweise SIA 384/1-Berechnung** (U·A-Bilanz). Das Tool arbeitet bewusst nur mit Verbrauchs- oder Bauperiodenkennwerten (FWS-Ansatz).
- **Vorlauftemperatur-Abschätzung aus Heizflächen** — wird oft gefragt, aber nicht implementiert.

---

## 6. Session-Verlauf (Kurzfassung)

1. Grundgerüst M1–M3 gebaut, FWS-Formeln implementiert.
2. M4 Sanierung, M5 WW, M6 Sperrzeit, M7 WP-Auslegung.
3. **Bug:** Aufgabe 2 aus FWS-Referenz lieferte falsches Qhl, weil M1 bei `inklWW=true` tvoll auf 2300 setzte, obwohl nach WW-Abzug tvoll=2000 korrekt wäre. **Fix:** tvoll entkoppelt von M1-WW-Frage, manueller Override eingebaut.
4. M8 (WW-Speicher FWS §10/§11), M9 (Heizpuffer SWKI/VDI).
5. Aktuelles Projekt **Dählenweg 4, 4536 Attiswil** — EFH 1960, 2018 teilsaniert, 129.88 m² EBF, 2500 L Öl/a, 4 Personen (aktuell 2 Bewohner, dimensioniert auf 4). Ergebnis: **Qhl ≈ 8.43 kW** (η 0.80, WW-Abzug 160 l/d), **Qh ≈ 9.0 kW** ohne Qw bzw. 9.5 kW mit. Kunde hat 8-kW-L/W-Monoblock bestellt — Fazit: vertretbar mit VL ≤ 40 °C und Heizstab-Reserve, 12 kW wäre überdimensioniert.
6. **Kunden-PDF ausgebaut** zu Angebots-Layout (Logo gross, Projektdaten, Kennwert-Tabelle, Sanierung als Klartext ohne Prozentangaben, Grundlagen-Abschnitt). Interne Module im Kundenmodus komplett ausgeblendet.

---

## 7. Offene Themen / mögliche nächste Schritte

- **Adresszeile** im Kunden-Report (Kunde, Objekt-Adresse) — aktuell nur Projektname.
- **CI-Farben** (Thermowerk-Blau `#1B2A4A` ist Platzhalter — Daniel kann eigene CI-Farben liefern).
- **WW-Leitungsverluste-Preset** in M5 (Dropdown: "Durchlauferhitzer", "Zirkulation unbekannt", "Warmhaltebänder", "Keine Warmhaltung") mit vorausgefüllten Prozentwerten.
- **Vorlauftemperatur-Check** via Heizkörper-Datenbank (neues Modul M10?) — Daniel fragte mehrfach indirekt danach.
- **Raumliste-Modul** für SIA 384/1-artige raumweise Bilanz — explizit als optional diskutiert, bisher zurückgestellt.

---

## 8. Wichtige Dateien

- **Standalone zum Testen/Weitergeben:** `/sessions/exciting-brave-ride/mnt/Desktop/thermowerk-heizlast/Thermowerk-Heizlast.html`
- **Regressionstest:** `/sessions/exciting-brave-ride/test-aufgabe2.mjs`
- **FWS-Referenz (Foliensatz):** wurde im Laufe der Sessions mehrfach als PDF-Upload gezeigt — sollte bei Bedarf wieder angefragt werden.
- **Dieses Handoff-Dokument:** `/sessions/exciting-brave-ride/mnt/Desktop/thermowerk-heizlast/CLAUDE-HANDOFF.md`

---

## 9. Erste Aktionen für neue Session

1. Diese Datei lesen.
2. Bei Änderungsauftrag zuerst `js/modules/…` oder `css/style.css` anpassen, dann Bundle + Standalone neu bauen (Skripte oben).
3. Nach jeder relevanten Änderung: `node test-aufgabe2.mjs` laufen lassen (Soll: Qhl = 12.55 kW).
4. Dem User das fertige Standalone via `computer:///sessions/exciting-brave-ride/mnt/Desktop/thermowerk-heizlast/Thermowerk-Heizlast.html` verlinken.
5. Knapp antworten, keine Task-Listen im Antworttext.
