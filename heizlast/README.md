# Thermowerk Heizlast — Neubau

Heizlast eines Gebäudes berechnen und als Bericht ausgeben, in zwei umschaltbaren Modi: **FWS-Kurs** (Verbrauchsmethode) und **raumweise nach SIA 384/2:2020**; mit sichtbaren Fallbacks (Herkunft, Annahme, Unsicherheit je Wert) und einem Heizkörper-Modul (nötige Vorlauftemperatur je Raum → WP-Tauglichkeit).

Verbindliche Grundlage: `docs/revision/KONTEXT.md` (Zweck, Architektur-Entscheide, Arbeitsregeln, Definition of Done), `docs/revision/PLAN.md` (12 Sessions mit fertigen Prompts), `docs/revision/BEFUND.md` (Revision des alten Tools).

## Session-Stand

| Session | Stand | Inhalt |
|---|---|---|
| 1 | **erledigt** (2026-10-29) | Repo-Ordner, Stack, Pages-Build, Referenzmaterial, Shell + Schritt 0, Design-Tokens |
| 2 | **erledigt** (2026-10-29) | Datenbasis `data/*.json` (6 Dateien, Quellen je Tabelle), Daten-Tests (141), `docs/datenquellen.md`, Recherche-Berichte `docs/recherche/` |
| 3 | **erledigt** (2026-10-29) | Kern FWS-Modus: `src/kern/fws.ts`, `warmwasser.ts`, `zuschlaege.ts`, `speicher.ts`, `plausi.ts` mit Herkunftsmodell; `src/daten/fws.ts` (Loader + Schema), `data/hydraulik.json`; 74 Kern-Tests gegen Kurslösungen (API: `src/kern/README.md`) |
| 4 | **erledigt** (2026-10-29) | Kern raumweise SIA 384/2 + Hüllen-Kaskade: `src/kern/klima.ts`, `huelle.ts`, `raumweise.ts`; Loader `src/daten/huelle.ts`, `sia384.ts`, `klima.ts`; Daten 1.1.0 (Schichtvorlagen, Innenbauteile, Erdreich-Formel, Jahresmittel-Regression, EBF-Faktor); 61 Kern-Tests (Referenzhäuser 238/5 + IBO, CH-EFH von Hand, Property-Tests) |
| 5 | **erledigt** (2026-10-29) | Kern Wärmeabgabe/Heizkörper: `src/kern/waermeabgabe.ts` (Q_N aus Typenschild > Modell-DB > Bauart + Massen > alte Heizkurve, eine Exponenten-Tabelle, log. Übertemperatur, Minderungen f1–f5, Raum-Deckung, θ_VL,req per Bisektion, Gebäude-Auslegungs-VL mit Ampel 55/65 °C, Massnahmen, FWS-Modus mit verteilter Heizlast); Loader `src/daten/heizkoerper.ts`; Daten 1.1.0 (`auslegung`); 33 Kern-Tests gegen Befund B1–B3, Datenblätter, Wissensbasis E |
| 6 | **erledigt** (2026-10-29) | Ergebnis, State, Persistenz: `src/state/schema.ts` (State v2 nur Rohangaben + Validierung `normalisiereState`), `src/kern/berechne.ts` (einziger Rechenpfad → `Ergebnis`), `src/kern/relevanz.ts` (Relevanz-Tabelle), `src/kern/geraet.ts` (Filter, Dimensionierungs-Ampel, Bivalenz Folie 95), `src/state/store.ts` (Signals, Pfad-Setter, Aktionen), `hydrate.ts` (ein Ladepfad, Migrationskette v1→v2), `persistenz.ts` (Entwurf + Projektliste, Autosave ≥ 1 s, Fehler sichtbar, Rückfrage, Cloud-Schnittstelle); Shell an Store/Ergebnis angebunden; Ampel als Prozent-Skala (`src/kern/skala.ts`, `ui/komponenten/Skala.tsx`); 104 neue Tests + Playwright-Persistenz/Skala |
| 7 | **erledigt** (2026-10-29) | UI Teil 1: Shell (Topbar mit Projektliste, Schrittleiste mit Status aus dem Ergebnis, sticky/kompakt mobil, Zurück/Weiter), Dashboard (Q_h mit Methode + Status, Aufschlüsselung, W/m² mit EBF-Herkunft, Vorlauf-Skala + kritische Räume, Speicher, WP-Skala, Annahmen-Liste mit Sprungziel, Fortschritt je Schritt; mobil als Leiste), Komponenten (Felder mit ⓘ-Popover, Inline-Hinweisen, Validierung, sichtbaren Standardwerten; Herkunfts-Chip; Stufen-Picker; Ampel mit Legende; Tabellen), Schritte 0–4 (Projekt & Methode, Gebäude, Sanierungen, Verbrauch, Hülle & Räume, Heizlast); Playwright-Durchläufe Moosseedorf und CH-EFH |
| 7b | **erledigt** (2026-10-30) | Fixes nach Test durch Daniel: Verbrauchserfassung wie im FWS-Rechner oder besser (`src/kern/verbrauchsreihe.ts`: Lieferungen + Tank-/Lagerstände, Zählerstände, Zeiträume taggenau/monatsgenau, Kalenderjahr; Prüfungen; Hochrechnung nach Heizgradtag-Anteil), Heizgradtage automatisch (`data/heizgradtage.json` aus MeteoSchweiz Open Data, `src/kern/heizgradtage.ts`), Klimabereinigung «alles oder nichts», Sanierungswirkung je Zeitraum sichtbar; raumweise ohne Pflicht-Klick (Standard-Bauteiltypen im Kern, `src/kern/standardtypen.ts`, generische Arten boden/decke + Anschluss «wie Gebäude»); Mobil: Popover im Viewport, Schrittleiste zentriert, kein horizontales Scrollen; State v3 mit Migration v2→v3 |
| 8 | **erledigt** (2026-10-30) | UI Teil 2: Schritt 5 Warmwasser künftig (bedingte Felder, Ladetemperatur → ΔT, Q_w), 6 Wärmeabgabe (Heizkreise, Ziel-Vorlauf, Räume — im FWS-Modus eigene Raumliste nur für Heizflächen —, «+ Heizfläche» mit Maske nach Bauart, «Genauer» mit Modell/Typenschild/Einbau, Live-Zeile Φ_HL · Σ Q · Deckung · θ_VL,req · Ampel · Massnahmen, Gebäude-Box mit Auslegungs-VL-Skala, Ausklammern, Override, alte Heizkurve), 7 Zuschläge & Leistung, 8 Speicher & Hydraulik (WW-Speicher, Puffer mit Kriterien/Override/abgewählt, MAG/SV), 9 Wärmepumpe (Filter mit Herkunft der VL, Liste, Auswahl mit WP-Grössen-Skala, Bivalenz, Modulation); Kern-Ergänzungen `standardwerte`, `filterVorlaufStandard`, `modulation`; Playwright `e2e/waermeabgabe.spec.ts`. Nachtrag (Entscheid Daniel 13:02): keine Zusatzmodule (Förderung/Bewilligung/Offerte gestrichen, Platzhalter entfernt), keine JAZ und kein Hinweis darauf, State v4 ohne `zusatz` |
| 9 | **erledigt** (2026-10-30) | Bericht: `src/bericht/` (Preact-Komponente aus dem einen Ergebnis, Kapitel nur wenn vollständig ableitbar: Objekt, Zusammenfassung, Rechenweg je Modus — FWS mit Zeitraum-Tabelle je Energieträger inkl. Herleitung der Menge, Heizgradtagen mit Herkunft, Jahresanteil, Sanierungs-Teilperioden; raumweise mit U·A·b-Tabelle je Raum und Bauteil-Grundlage —, Warmwasser, Zuschläge, **Wärmeabgabe** mit Fazit WP-Tauglichkeit, Speicher, Wärmepumpe, Plausibilität, Annahmen & Unsicherheiten, Normen/Quellen), Druck-CSS A4 nach BROSCH_CSS, Schritt 10 mit Vollständigkeits-Check (offene Pflichtangaben sperren, Warnungen übersteuerbar, ohne Gerät nur Warnung), PDF über den Druckdialog, JSON-Export + Laden aus Datei (`verwaltung.importieren`, hydrateState); `data/firma.json` (Absender), Logo `public/img/logo.png`; Tests `tests/bericht/bericht.test.tsx` (Bericht = Dashboard, Relevanz, Export), Playwright `e2e/bericht.spec.ts` (Druck-Smoke Desktop/Mobil, PDF) |
| 10, 12 | offen | siehe `docs/revision/PLAN.md` §3 — Session 11 (Zusatzmodule) entfällt |

Staging-URL: `https://thermowerk.ch/heizlast-neu/` (bzw. `*.pages.dev/heizlast-neu/`). Das Live-Tool unter `/heizlast/` bleibt bis Session 12 unverändert.

## Architektur

```
heizlast/
├─ src/
│  ├─ kern/      reine Funktionen (kein DOM, kein FS, kein Import aus ui/bericht) — einziger Rechenpfad berechne()
│  ├─ daten/     Loader + Schemas für data/*.json
│  ├─ state/     State-Schema v4 (nur Rohangaben), Store (Signals), Migrationen, Persistenz
│  ├─ ui/        Preact-Komponenten: Shell, Schritte, Dashboard — rechnet nichts, liest nur Ergebnis
│  └─ bericht/   Bericht (Vorschau = Druckvorlage) aus Ergebnis, Prüfliste, JSON-Export
├─ data/         Fachdaten als JSON mit _meta { version, stand, quellen[] } (Session 2)
├─ tests/        Vitest (Kern, State, Daten-Schemas)
├─ e2e/          Playwright (Desktop 1280 / Mobil 390)
├─ docs/         revision/ (Befund, Plan, Kontext, Protokoll, Screenshots), wissensbasis/, fws/ (Textauszüge)
└─ referenz/     Altes Tool zum Nachschlagen (nicht im Build): alt-calc, alt-tests, alt-export, alt-data, alt-style
```

Stack: Vite 6 · Preact 10 · @preact/signals · TypeScript (strict) · Vitest · Playwright · eslint 9 (flat config).

Regeln, die der Build erzwingt (`eslint.config.js`, `tests/shell.test.ts`):
- kein «ß» im Quelltext (Schweizer Schreibweise),
- `src/kern` und `src/daten` importieren nie aus `src/ui`, `src/bericht` oder `preact`, und nutzen keine DOM-Globals.

Datenfluss (Session 6): `state` (nur Rohangaben, `schemaVersion` 3 seit Session 7b: `verbrauch.reihen` je Energieträger statt flacher `eintraege`; 4 seit Session 8: ohne Platzhalter `zusatz`; Migrationen v2→v3→v4 in `hydrate.ts`) → `berechne(state, daten)` → `Ergebnis` → UI/Dashboard/Bericht/Persistenz-KPI. Änderungen nur über `store.setze(pfad, wert)` bzw. Aktionen (Pfade adressieren Listen über ids, z. B. `raeume.r2.bauteile.b1.flaecheM2`); `relevant(pfad, state)` entscheidet zentral, welche Angaben gelten. Laden immer über `hydrateState` (Version erkennen → Migrationen → Validierung); lokale Persistenz unter `thermowerk-heizlast-v2-entwurf` / `-projekte` (das alte Tool nutzt andere Schlüssel). State-API: `src/state/*.ts` (Kopfkommentare).

Herkunftsmodell: `src/kern/wert.ts` — jeder berechnete oder ergänzte Wert ist ein `Wert { wert, einheit, herkunft, stufe?, unsicherheit?, band?, begruendung, quelle? }`; Herkunft `berechnet` (Formel über andere Werte) ist selbst keine Annahme, die Eingangswerte landen in `annahmen[]`. Kern-API: `src/kern/README.md`.

Session 7b (Fixes nach Test): Verbrauch je Energieträger als Reihe mit Erfassungsart (`zeitraeume` Kalenderjahr/Monate/Tage, `lieferungen` = Tank-/Lagerstände + Lieferungen, `zaehlerstaende`); der Kern leitet daraus Zeiträume mit Rechenweg ab (`src/kern/verbrauchsreihe.ts`), holt Heizgradtage der Station (`src/kern/heizgradtage.ts`, `data/heizgradtage.json` = MeteoSchweiz-Monatswerte HGT 20/12 ab 2015, Script `scripts/heizgradtage-bauen.mjs`) und rechnet Teilzeiträume nach HGT-Anteil aufs Jahr hoch; ganze Kalenderjahre bleiben wie im Kurs. Klimabereinigung (Schalter) rechnet alle Zeiträume auf das SIA-Normjahr um. Raumweise: Raum-Bauteile brauchen keinen eigenen Bauteiltyp — ohne `typId` setzt `berechne()` einen Standard-Typ aus Baujahr/Keller/Dachform/Sanierungen ein (`src/kern/standardtypen.ts`, nicht im State; UI zeigt «Standard aus Baujahr 1965 · ±x %» und «Anpassen»); generische Arten `boden`/`decke` und Anschluss `auto` folgen dem Gebäude. Mobil: Popover werden im Viewport gehalten (schmal: Leiste unten), die Schrittleiste zentriert den aktiven Schritt, alle Seiten ohne horizontales Scrollen (Playwright `e2e/mobil.spec.ts`).

UI Session 8 (`src/ui/seiten/Warmwasser.tsx`, `Waermeabgabe.tsx`, `Zuschlaege.tsx`, `Speicher.tsx`, `Waermepumpe.tsx`): gleiche Regeln wie Session 7 — Felder an State-Pfade, `rel()` entscheidet (Heizflächen-Masse über `relevanteMasse`), Standardwerte als Zahl mit Herkunfts-Chip (Mass-Standardwerte aus `HeizflaecheErgebnis.standardwerte`), Hinweise des Kerns unter `waermeabgabe.heizflaechen.<id>` an der Heizfläche. Typenschild wird nur als ganzes Objekt geschrieben (Leistung + Bezug 75/65/20 · 90/70/20 · 70/55/20 · 55/45/20). `ZahlFeld` übernimmt jetzt einen von aussen geänderten Wert auch bei gehaltenem Fokus (Typ-Wechsel, Zurücksetzen).

Bericht (Session 9, `src/bericht/`): `Bericht.tsx` rendert aus `{ state, ergebnis, daten, firma, datum }` — Zahlen, Rechenwege (Begründungen des Kerns) und Annahmen nur aus `Ergebnis`, der State liefert Beschriftungen (Projekt, Adresse, Erfassungsart, Masse der Heizflächen). `berichtKapitel()` entscheidet, welche Kapitel erscheinen (nur vollständig Ableitbares, keine Platzhalter). Formate wie im Dashboard (`ui/format.ts`), gemeinsame Klartexte in `ui/ergebnisTexte.ts` (Filter-VL-Herkunft, Sanierung je Zeitraum, Methodenname). `bericht.css`: Vorschau als Blatt (mobil fliessend), `@media print` blendet die App aus und setzt A4. `pruefliste.ts`: offene Pflichtangaben und Fehler sperren den Druck, Warnungen nach Bestätigung frei; fehlende Gerätewahl ist nur Warnung (Kapitel Wärmepumpe entfällt). `export.ts`: Projekt als JSON (State v4 unverändert) und Dateinamen. Laden aus Datei: Topbar «Projekte» → «Projekt aus Datei laden».

Design: Farbpalette und eckige Formensprache des alten Tools (`src/ui/styles/tokens.css`, abgeleitet aus `referenz/alt-style/style.css`); Layout und Komponenten neu. UI-Sprache Deutsch (Schweiz). Schrift IBM Plex Sans (tabellarische Ziffern). Leitidee seit Session 7: die Herkunft jedes Werts hat ein Muster, das überall gleich ist — Eingabe voll, berechnet Rahmen, Tabelle Linien, geschätzt Schraffur, Standardwert gestrichelt, eigener Wert über einem Standard roter Strich (Felder, Chips, Annahmen-Liste, Schrittstatus «mit Annahmen»).

UI (Session 7, `src/ui/`): `bindung.ts` (lesen/schreiben über State-Pfade, `rel(pfad)` = `relevant()`, Hinweise je Pfad, Zahl-Parsing), `komponenten/` (`Felder.tsx`: ZahlFeld mit Standardwert/Override, TextFeld, AuswahlFeld, JaNein, Segment, OptionKarten, Abschnitt; `Herkunft.tsx`: Chip + WertAnzeige; `Popover.tsx`; `StufenPicker.tsx`; `Ampel.tsx`; `Meldungen.tsx`; `Dashboard.tsx`; `Schrittleiste.tsx`; `Topbar.tsx`), `seiten/` (je Schritt eine Datei). Regeln: irrelevante Felder werden nicht gerendert (`rel`), Werte, Standardwerte, Status und Hinweise kommen nur aus `Ergebnis`, kein innerHTML, leere Werte als «—».

## Befehle

Im Ordner `heizlast/` (Node ≥ 22):

| Befehl | Zweck |
|---|---|
| `npm install` | Abhängigkeiten |
| `npm run dev` | Entwicklungsserver (http://localhost:5173/heizlast-neu/) |
| `npm test` | Vitest |
| `npm run lint` | eslint + tsc |
| `npm run build` | tsc + Vite-Build nach `../public/heizlast-neu/` |
| `npm run e2e:install` | Chromium für Playwright (einmalig) |
| `npm run e2e` | Playwright-Smoke (baut, startet Preview, Desktop + Mobil; Screenshots nach `docs/revision/shots-neu/`) |
| `npm run e2e:staging` | dieselben Durchläufe gegen die deployte Staging-URL (`STAGING_URL` überschreibbar) |

Im Repo-Root: `npm run build` baut zuerst `heizlast/` (inkl. `npm ci`), dann Astro. Cloudflare Pages liefert `dist/` aus, der Vite-Output liegt darin unter `heizlast-neu/`.

## Deployment (Cloudflare Pages)

- Build-Befehl im Pages-Projekt: `npm run build` (Root). Output: `dist` (wrangler.toml `pages_build_output_dir`).
- Node-Version: `.node-version` im Root = 22 (Vite 6 braucht ≥ 20.19). Falls im Dashboard `NODE_VERSION` gesetzt ist, muss er ≥ 22 sein.
- Backend bleibt `functions/api/heizlast-*.js` + D1 `thermowerk-data`; Neubau der Auth in Session 10.

## Datenquellen

`data/` enthält acht Fachdaten-Dateien plus `firma.json` (Absender im Bericht, Session 9) (Übersicht in `data/README.md`): `fws.json`, `hydraulik.json` (MAG/Sicherheitsventil, Session 3), `waermepumpen.json`, `klimastationen.json`, `huelle-epochen.json`, `sia384-2.json`, `heizkoerper-tabellen.json`, `heizgradtage.json` (Session 7b: Monats-HGT 20/12 je SIA-Station aus MeteoSchweiz Open Data, erzeugt mit `node scripts/heizgradtage-bauen.mjs`; Kontrolle: eigenes Mittel 1984–2003 trifft SIA 2028 auf ±0.7 %). Der Kern bekommt sie über `src/daten/` (`fwsDaten()`, `hydraulikDaten()`, `huelleDaten()`, `siaDaten()`, `klimaDaten()`, `heizkoerperDaten()`, `waermepumpenDaten()`, `heizgradtageDaten()`; gebündelt `alleDaten()` in `src/daten/index.ts`; Schema per TypeScript-Interface, vom Build geprüft). Primärquellen: SIA 2028-C1:2015, SIA 384.201-C1:2014 / SN EN 12831-1-C1:2020, SIA 380/1-Vollzugshilfen, BFE Bauteilekatalog 2002, GEAK/BFE-UFELD, EnFK Merkblatt Fenster 2021, FWS-Kursunterlagen M3 (`docs/fws/*.txt`), Wissensbasis A–N (`docs/wissensbasis/`), Hersteller-Datenblätter (Buderus, Kermi, Purmo, V&N, Stelrad, Brugman, HG-TEC, Zehnder, JOCO, Uponor, WEM …). Stichproben mit Zahl/Quelle/Datum: `docs/datenquellen.md`; vollständige Recherche-Berichte: `docs/recherche/`. Tests: `tests/daten/*.test.ts` (Schema je Datei, Plausibilität, externe Referenzwerte wie Kurslösungen und Befund-Beispiele B1–B3).

Als Annahme gekennzeichnet (nicht öffentlich belegbar): Höhengradient θe 0.6 K/100 m, SIA 384/2 Anhang A/B (ersetzt durch ND.3 / ISO-13370-Formel mit f_g1·f_g2·f_GW), ΔU_WB 0.10/0.05, SIA-2024-Innentemperaturen, Exponent Gliederradiatoren, FBH bei exakt 35/28, Epochenzuordnung Böden/Türen, Jahresmittel-Höhenregression (±1 K), Schichtvorlagen der Bauweisen ohne Epochen-Default, Innenbauteil-Aufbauten, EBF = Σ Nettoflächen × 1.10 (FWS Folie 33), Unsicherheits-Stufen der Hüllen-Kaskade (±30/20/10 %).

## Offene Punkte

- Sessions 10 und 12 gemäss Plan (Session 11 entfällt).
- Session 9: PDF entsteht über den Druckdialog des Browsers (keine Seitenzahlen; Chrome/Safari drucken Kopf-/Fusszeile nach eigener Einstellung). Lange Quellenketten (z. B. alle Datenblätter einer Heizkörper-Tabelle) werden im Annahmen-Kapitel auf die ersten Angaben gekürzt («u. a.»), vollständig in `data/*.json`.
- Grundsatz (Daniel 30.10.): nur einbauen, was vollständig und belegt ableitbar ist — sonst weglassen, ohne Verweis in der App.
- Session 8, JAZ: **nicht eingebaut** und in der App nicht erwähnt (Grundsatz oben). Begründung: Die greifbaren Kurzverfahren (VDI 4650 Bin-Methode, GEG/BEG-Mindestwerte in Wissensbasis I) sind deutsch und brauchen Stundenhäufigkeiten der Aussentemperatur je Station sowie COP-Kennwerte bei der Auslegungs-VL; die Gerätedatenbank kennt den COP nur bei W35, die FWS-Unterlagen enthalten keine JAZ-Formel — nicht vollständig ableitbar.
- Session 8, Entscheid Lazy-Load der Gerätedatenbank: **nicht nötig.** Bundle 745 kB (195 kB gzip); `waermepumpen.json` macht davon rund 14 % aus (105 kB roh), die Heizkörper-Tabellen (196 kB) und Hüllen-Epochen (95 kB) sind grösser. Lazy-Load nur der Geräte würde den einen Rechenpfad (`berechne` liest `daten.wp` für Filter, Auswahl und Puffer-Mindestvolumen) asynchron machen, ohne spürbaren Gewinn. Falls nötig später: alle Fachdaten gemeinsam als ein Chunk nach dem ersten Rendern.
- Session 8: Modulation nur bei 5 Geräten in der Datenbank erfasst (Oertli); ohne Eintrag zeigt die UI keine Modulationszeile. Keine Ampel für die untere Modulationsgrenze (keine belegte Schwelle). Bivalenz-Text nach FWS Folie 95 (zwischen 50 und 100 % interpoliert = Annahme). Zusatzverbraucher (Q_as) werden mit Leistung angelegt und nur ganz entfernt (Liste ohne ids im Schema).
- Session 7b: Heizgradtage reichen von 2015-01 bis zum letzten vollständigen Monat des Erzeugungslaufs (`data/heizgradtage.json` `_meta.zeitraum`); für neuere Zeiträume das Script erneut laufen lassen (`node scripts/heizgradtage-bauen.mjs`, braucht Netz zu data.geo.admin.ch) — bis dahin meldet die UI «keine Heizgradtage» und rechnet nach Tagen. Teilmonate werden anteilig aus dem Monatswert genähert (±5 %). Hochrechnungs-Regel (Thermowerk): Jahresanteil = HGT(Zeitraum) / mittlere Jahres-HGT der n Kalenderjahre bis zum Zeitraumende (n = aufgerundete Jahre); ganze Kalenderjahre (365/366 Tage) nach Tagen. Streuungs-Ampel berücksichtigt Zeiträume ab 60 % der Jahres-HGT bzw. ab 300 Tagen. Mobil sind Export und Speicherstatus ausgeblendet (Status sichtbar über «Speichern»/Fehlerbanner).
- Session 6: Inverter-Faustregel «Q_h ≥ 0.75 · Q_WP» — im Skript ist die Antwort zu Folie 3 nicht abgedruckt (0.75 aus FWS-RECHENWEGE §16.2); Aufgabe 4 nennt 9.0/12 kW «überdimensioniert» (Grenzfall, Ampel grün am Rand). Standardwerte (29.10.): gelb +33 … +37 %, darüber rot; zu klein bis −9 % gelb; θe ohne Standort −8 °C (`klimastationen.json standardThetaE`), mit Station deren Wert, immer überschreibbar; Auslegungs-VL ohne Heizflächen nach System FBH 35 / Radiatoren 55 °C (`waermeabgabe.system`). Filtertoleranz 10 % und die Bivalenz-Interpolation zwischen 50 und 100 % sind Thermowerk-Annahmen. JAZ-Schätzung nicht übernommen (alte Formel ohne Quelle) — Entscheid in Session 8. Q_WP aus der DB gilt bei A−7/W35, nicht bei der Auslegungs-VL (Hinweis im Ergebnis).
- Session 6/7b: Bundle 694 kB (Fachdaten-JSON im Bundle, +33 kB Heizgradtage); Code-Splitting/Lazy-Load der Gerätedatenbank bei Bedarf in Session 8.
- Session 5, dokumentierte Abweichungen: Befund B3 rechnete mit dem alten Fallback (Q_N 1032 W); die neue Plattentabelle (Mittel 6 Hersteller) gibt 1064 W → θ_VL,req 79.7/70.6/60.5 °C statt 81/72/61 (Test ±2 K; mit Q_N 1032 W exakt 81.1 °C). Verkleideter Konvektor: V&N-Kontec-Zeilen gleicher Tiefe und Höhe (KK20/KK22) werden gemittelt (±29 % mit Einbau-Standardwert). Spreizung-Standard 10 K (Radiatoren) ist konservativ; WP-Betrieb mit 5–7 K senkt θ_VL,req um 1–3 K.
- Session 4, dokumentierte Abweichungen: Referenzhaus 238/5 Flur −106 W statt −95 W (Formblatt rundet f_RT auf −0.18); saldierte Gebäude-Heizlast 4289 W gegenüber Formblatt G 3560 W (DIN-Erdreichfaktoren auf Gebäudeebene, nicht reproduzierbar); IBO Erdreich 289 W statt 246 W (ISO-13370-Formel statt DIN-Tabelle, 4 % der Last). Property «mehr Wissen ⇒ |ΔU| ≤ 25 % gegen Spannenmitte» ist physikalisch nicht für alle legitimen Eingaben haltbar (Beton 20 cm ungedämmt vs. Hohlmauer: +46 %); getestet wird stattdessen: Bestätigen der Defaults ändert nichts, epochentypische Eingaben bleiben in der Epochen-Spanne (Clamp), Dicke ±1 typische Stufe ≤ 25 %, Monotonie.
- Raumhöhe ≥ 4 m (SIA 384/2 Tabelle 9) nur als Warnung; Wärmegewinne (SIA 384/2 Kap. 7) nicht angerechnet; Trägheitskorrektur θe (Kap. 5) nicht angewendet (konservativ).
- Fragerunde 3 beantwortet (29.10.): Bad 22 °C, Flur 20 °C, Eingangsbereich 15 °C, WW-Standard 45 l/P·d, HK primär nach Bauart/Masse.
- Session 3, dokumentierte Abweichung: WW-Verluste additiv (Folie 49/SIA 385/2); die Kurslösungen 2–4 verketten multiplikativ — Q_h innerhalb ±1 %, Q_w bis 3 %.
- Klimabereinigung (HGT): seit Session 7b automatisch aus `data/heizgradtage.json` (manuell überschreibbar); mit Schalter werden alle Zeiträume (auch ganze Jahre) auf das SIA-Normjahr umgerechnet, ohne Schalter gilt der Kurs.
- Screenshot-Referenz des alten Tools: `docs/revision/shots/`; des Neubaus: `docs/revision/shots-neu/`.
- Nicht im Umfang: Förderung, Bewilligung, Offerte (Daniel 30.10.; alter Code nur als Referenz in `referenz/alt-calc/`) und Hydraulik-Schemas (`referenz/alt-data/hydraulik-schemas-katalog.json` nur zum Nachschlagen).
