# Thermowerk Heizlast — Neubau

Heizlast eines Gebäudes berechnen und als Bericht ausgeben, in zwei umschaltbaren Modi: **FWS-Kurs** (Verbrauchsmethode) und **raumweise nach SIA 384/2:2020**; mit sichtbaren Fallbacks (Herkunft, Annahme, Unsicherheit je Wert) und einem Heizkörper-Modul (nötige Vorlauftemperatur je Raum → WP-Tauglichkeit).

Verbindliche Grundlage: `docs/revision/KONTEXT.md` (Zweck, Architektur-Entscheide, Arbeitsregeln, Definition of Done), `docs/revision/PLAN.md` (12 Sessions mit fertigen Prompts), `docs/revision/BEFUND.md` (Revision des alten Tools).

## Session-Stand

| Session | Stand | Inhalt |
|---|---|---|
| 1 | **erledigt** (2026-10-29) | Repo-Ordner, Stack, Pages-Build, Referenzmaterial, Shell + Schritt 0, Design-Tokens |
| 2–12 | offen | siehe `docs/revision/PLAN.md` §3 |

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

Herkunftsmodell: `src/kern/wert.ts` — jeder berechnete oder ergänzte Wert ist ein `Wert { wert, einheit, herkunft, stufe?, unsicherheit?, begruendung, quelle? }`.

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

Session 2 füllt `data/`. Primärquellen: SIA 2028, SIA 380/1, SIA 384/2:2020, SN EN 12831-1, EN 442, FWS-Kursunterlagen M3 (`docs/fws/*.txt`), Wissensbasis A–N (`docs/wissensbasis/`), Hersteller-Datenblätter. Jede Zahl mit Quelle in `docs/datenquellen.md` (ab Session 2).

## Offene Punkte

- Sessions 2–12 gemäss Plan.
- Screenshot-Referenz des alten Tools: `docs/revision/shots/`; des Neubaus: `docs/revision/shots-neu/`.
- Zurückgestellt (nicht im Umfang): Hydraulik-Schemas (`referenz/alt-data/hydraulik-schemas-katalog.json` nur zum Nachschlagen).
