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
| 5–12 | offen | siehe `docs/revision/PLAN.md` §3 |

Staging-URL: `https://thermowerk.ch/heizlast-neu/` (bzw. `*.pages.dev/heizlast-neu/`). Das Live-Tool unter `/heizlast/` bleibt bis Session 12 unverändert.

## Architektur

```
heizlast/
├─ src/
│  ├─ kern/      reine Funktionen (kein DOM, kein FS, kein Import aus ui/bericht) — einziger Rechenpfad berechne()
│  ├─ daten/     Loader + Schemas für data/*.json
│  ├─ state/     State-Schema v2 (nur Rohangaben), Store (Signals), Migrationen, Persistenz
│  ├─ ui/        Preact-Komponenten: Shell, Schritte, Dashboard — rechnet nichts, liest nur Ergebnis
│  └─ bericht/   HTML/PDF-Bericht aus Ergebnis
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

Herkunftsmodell: `src/kern/wert.ts` — jeder berechnete oder ergänzte Wert ist ein `Wert { wert, einheit, herkunft, stufe?, unsicherheit?, band?, begruendung, quelle? }`; Herkunft `berechnet` (Formel über andere Werte) ist selbst keine Annahme, die Eingangswerte landen in `annahmen[]`. Kern-API: `src/kern/README.md`.

Design: Farbpalette und eckige Formensprache des alten Tools (`src/ui/styles/tokens.css`, abgeleitet aus `referenz/alt-style/style.css`); Layout und Komponenten neu. UI-Sprache Deutsch (Schweiz).

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

Im Repo-Root: `npm run build` baut zuerst `heizlast/` (inkl. `npm ci`), dann Astro. Cloudflare Pages liefert `dist/` aus, der Vite-Output liegt darin unter `heizlast-neu/`.

## Deployment (Cloudflare Pages)

- Build-Befehl im Pages-Projekt: `npm run build` (Root). Output: `dist` (wrangler.toml `pages_build_output_dir`).
- Node-Version: `.node-version` im Root = 22 (Vite 6 braucht ≥ 20.19). Falls im Dashboard `NODE_VERSION` gesetzt ist, muss er ≥ 22 sein.
- Backend bleibt `functions/api/heizlast-*.js` + D1 `thermowerk-data`; Neubau der Auth in Session 10.

## Datenquellen

`data/` enthält sieben JSON-Dateien (Übersicht in `data/README.md`): `fws.json`, `hydraulik.json` (MAG/Sicherheitsventil, Session 3), `waermepumpen.json`, `klimastationen.json`, `huelle-epochen.json`, `sia384-2.json`, `heizkoerper-tabellen.json`. Der Kern bekommt sie über `src/daten/` (`fwsDaten()`, `hydraulikDaten()`, `huelleDaten()`, `siaDaten()`, `klimaDaten()`; Schema per TypeScript-Interface, vom Build geprüft). Primärquellen: SIA 2028-C1:2015, SIA 384.201-C1:2014 / SN EN 12831-1-C1:2020, SIA 380/1-Vollzugshilfen, BFE Bauteilekatalog 2002, GEAK/BFE-UFELD, EnFK Merkblatt Fenster 2021, FWS-Kursunterlagen M3 (`docs/fws/*.txt`), Wissensbasis A–N (`docs/wissensbasis/`), Hersteller-Datenblätter (Buderus, Kermi, Purmo, V&N, Stelrad, Brugman, HG-TEC, Zehnder, JOCO, Uponor, WEM …). Stichproben mit Zahl/Quelle/Datum: `docs/datenquellen.md`; vollständige Recherche-Berichte: `docs/recherche/`. Tests: `tests/daten/*.test.ts` (Schema je Datei, Plausibilität, externe Referenzwerte wie Kurslösungen und Befund-Beispiele B1–B3).

Als Annahme gekennzeichnet (nicht öffentlich belegbar): Höhengradient θe 0.6 K/100 m, SIA 384/2 Anhang A/B (ersetzt durch ND.3 / ISO-13370-Formel mit f_g1·f_g2·f_GW), ΔU_WB 0.10/0.05, SIA-2024-Innentemperaturen, Exponent Gliederradiatoren, FBH bei exakt 35/28, Epochenzuordnung Böden/Türen, Jahresmittel-Höhenregression (±1 K), Schichtvorlagen der Bauweisen ohne Epochen-Default, Innenbauteil-Aufbauten, EBF = Σ Nettoflächen × 1.10 (FWS Folie 33), Unsicherheits-Stufen der Hüllen-Kaskade (±30/20/10 %).

## Offene Punkte

- Sessions 5–12 gemäss Plan.
- Session 4, dokumentierte Abweichungen: Referenzhaus 238/5 Flur −106 W statt −95 W (Formblatt rundet f_RT auf −0.18); saldierte Gebäude-Heizlast 4289 W gegenüber Formblatt G 3560 W (DIN-Erdreichfaktoren auf Gebäudeebene, nicht reproduzierbar); IBO Erdreich 289 W statt 246 W (ISO-13370-Formel statt DIN-Tabelle, 4 % der Last). Property «mehr Wissen ⇒ |ΔU| ≤ 25 % gegen Spannenmitte» ist physikalisch nicht für alle legitimen Eingaben haltbar (Beton 20 cm ungedämmt vs. Hohlmauer: +46 %); getestet wird stattdessen: Bestätigen der Defaults ändert nichts, epochentypische Eingaben bleiben in der Epochen-Spanne (Clamp), Dicke ±1 typische Stufe ≤ 25 %, Monotonie.
- Raumhöhe ≥ 4 m (SIA 384/2 Tabelle 9) nur als Warnung; Wärmegewinne (SIA 384/2 Kap. 7) nicht angerechnet; Trägheitskorrektur θe (Kap. 5) nicht angewendet (konservativ).
- Fragerunde 3 beantwortet (29.10.): Bad 22 °C, Flur 20 °C, Eingangsbereich 15 °C, WW-Standard 45 l/P·d, HK primär nach Bauart/Masse.
- Session 3, dokumentierte Abweichung: WW-Verluste additiv (Folie 49/SIA 385/2); die Kurslösungen 2–4 verketten multiplikativ — Q_h innerhalb ±1 %, Q_w bis 3 %.
- Klimabereinigung (HGT) braucht HGT-Istwerte je Jahr und Station als Eingabe (HEV/MeteoSchweiz); keine Jahreswerte in `data/`.
- Screenshot-Referenz des alten Tools: `docs/revision/shots/`; des Neubaus: `docs/revision/shots-neu/`.
- Zurückgestellt (nicht im Umfang): Hydraulik-Schemas (`referenz/alt-data/hydraulik-schemas-katalog.json` nur zum Nachschlagen).
