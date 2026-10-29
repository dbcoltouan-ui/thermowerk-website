# KONTEXT — Neubau «Thermowerk Heizlast» (für jede Folge-Session zuerst lesen)

Stand: 2026-10-29 (Regel 10 + Design 16:34) · Auftraggeber: Daniel (Thermowerk, Heizungs-/WP-Fachbetrieb, Schweiz) · Ausführung: Claude (Sessions laut `PLAN.md`), Daniel prüft und gibt frei.

## 1. Zweck (verbindlich)
Heizlast eines Gebäudes berechnen und als Bericht ausgeben, in zwei umschaltbaren Modi:
- **FWS-Kurs** (Verbrauchsmethode nach FWS M3 + mathematisch korrekte Ergänzungen: Mehrjahres-Mittelung, Sanierungen jahresgenau gewichtet, EBF aus Räumen, WW/Puffer/Speicher nach Kurs).
- **raumweise** nach **SIA 384/2:2020** (Anwendung von SN EN 12831-1 = SIA 384.201 in der Schweiz; Begründung in `BEFUND.md §3.1`).
- Mehrstufige, **monotone**, sichtbare Fallbacks (Herkunft, Annahme, Unsicherheit je Wert).
- Schritt für Schritt, bedingte Felder, **eine Quelle der Wahrheit** (Dashboard = Seiten = Bericht).
- **Priorität: Heizkörper-Modul** — ohne Marke aus Bauart + Höhe + Länge + Tiefe/Gliederzahl → Q_N (EN 442) → Umrechnung (Exponent, log. Übertemperatur) → nötige VL je Raum → Gebäude-VL → WP-Tauglichkeit → zu kleine HK markiert + Massnahme; in Dashboard und Bericht; in beiden Modi nutzbar. Zielbild: `befund_heizkoerper.md §6`.

## 2. Architektur-Entscheide (gelten für alle Sessions)
| Thema | Entscheid | Begründung |
|---|---|---|
| Ablage | Ordner `heizlast/` **im Git-Repo `thermowerk-website`** (Monorepo). Build-Output → `public/heizlast/` beim Pages-Build. Backend bleibt `functions/api/`. | Versionierung + ein Deploy (BUILD-03/04). Altes Tool `Thermowerk\Heizlast Tool\` bleibt eingefroren als Referenz. |
| Stack | **Vite + Preact + @preact/signals + TypeScript**, Tests **Vitest** (Kern) + **Playwright** (E2E), **eslint** im Build. | Deklaratives Rendering statt innerHTML/Regex (CODE-05/06); echter Bundler statt Regex-Bundler (BUILD-02); Typen gegen Schlüssel-Chaos (CODE-22–24). |
| Schichten | `src/kern/` (reine Funktionen, keine DOM/FS), `src/daten/` (Loader + Schemas), `src/state/` (Schema v2, Store, Migrationen, Persistenz), `src/ui/` (Schritte, Dashboard, Komponenten), `src/bericht/` (HTML/PDF). Kern importiert nie aus ui. | CODE-01. |
| Eine Quelle der Wahrheit | `berechne(state, daten) → Ergebnis` ist der **einzige** Rechenpfad. UI, Dashboard, Bericht, Cloud-KPI, Gerätefilter, Offerte lesen nur `Ergebnis`. UI rechnet nichts. Abgeleitete Werte werden nie in den State geschrieben. | CODE-02/08, FLOW-01/07/09. |
| Herkunftsmodell | Jeder berechnete oder ergänzte Wert ist ein `Wert = { wert, einheit, herkunft: 'eingabe'\|'messung'\|'tabelle'\|'schaetzung'\|'fallback'\|'override', stufe?: string, unsicherheit?: number (±%), begruendung: string, quelle?: string }`. `Ergebnis.annahmen[]` sammelt alle Nicht-Eingaben. Bericht hat Kapitel «Annahmen & Unsicherheiten». | UX-50–52, Vorgabe «Fallback sichtbar». |
| Relevanz | `relevant(feldPfad, state): boolean` zentral; UI rendert irrelevante Felder **nicht** (kein `hidden`, kein Dimmen); Bericht druckt nur relevante Werte. | UX-10–14. |
| Modus | `state.methode: 'fws' \| 'raumweise'` explizit, Schritt 0. Wechsel behält Daten, zeigt Hinweis, welche ruhen. `Ergebnis.heizlast.massgebend` = genau eine Quelle mit Herkunft. | UX-02. |
| State | Nur Rohangaben, `schemaVersion`, `hydrateState(raw)` mit versionierten Migrationen (eine Kette, getestet mit eingefrorenen Fixtures). Alte Projekte des alten Tools müssen **nicht** importierbar sein (Daniel). | FLOW-03/04, BUILD-11. |
| Fallback-Kaskade Hülle | **Eine** Schichtkette je Bauteil: Epochen-Default-Aufbau **Bestand** (nicht Sanierung) → jede bekannte Stufe (Dicke, Bauweise, Dämmung, Dämmdicke, Fenstergeneration) ersetzt genau ihre Schicht → U nach ISO 6946 → Plausi-Clamp in die Epochen-Spanne (mit Hinweis). Tabellen-U nur zur Kalibrierung der Defaults, nie als zweiter Pfad. Property-Test: mehr Wissen ⇒ kein Sprung > 25 % gegen die Spannenmitte, Monotonie Dämmung↑ ⇒ U↓. | FACH-21, DATA-02. |
| Raumweise (SIA 384/2) | Transmission U·A·(θint−θe)·b; b_u-Tabelle (unbeheizte Räume), U_equiv Erdreich (Anhang B / ISO 13370-Tabelle), ΔU_WB pauschal (0.10 Bestand / 0.05 Neubau, als Annahme); Lüftung V·n_min·0.34 mit n_min-Tabelle nach Raumtyp/Lüftungskonzept; **kein** n50-Term, **keine** Aufheizreserve; θe aus SIA-2028-Station (PLZ → Station + Höhenkorrektur, Override mit Herkunft); Gebäude-Heizlast **saldiert** (nur Hülle nach aussen) separat von Σ Räume (für Heizflächen). Methode im Bericht wörtlich nennen. | FACH-22–26, 30. |
| FWS | Primitive aus `fws.mjs` übernehmen; Verbrauch als Jahresraster (Jahr × Energieträger, Menge, Zeitraum), Jahreswert = Σ Menge·365/Σ Tage je Träger, Mittel über Jahre, Streuungs-Ampel, Überlappungsprüfung; Sanierungen nach `FWS-RECHENWEGE.md §3a` (Sub-Perioden, kumulativer Faktor); Methode B: Qn = h·Q_WP (oder kWh·COP), Qhl = Qn/tvoll; Konvention «FWS-Kurs (Ho 10.5/10.4, Kurs-η)» Default im FWS-Modus, «Hi» als Option, im Bericht ausgewiesen; tvoll nach Nutzung × Höhe ü. M. (Folie 16); Sperrzeit kumuliert h/d 0–8; WW-Verluste additiv (Folie 49), «WW bisher über Heizung?» und «WW künftig über WP?» als zwei Fragen; ΔT_Speicher = T_Lade − 10; Puffer = max(Hersteller-Minimum, Quellen-Kriterium) mit Begründung; optionale HGT-Klimabereinigung klar als «nicht FWS» markiert. Golden-Tests = Kurslösungen. | FACH-01–16, 40–41. |
| Wärmeabgabe (HK) | Datenmodell je Heizfläche: `bauart` (Enum), bedingte Masse (Höhe/Länge/Tiefe bzw. Säulen/Glieder), optional Modell/Typenschild (mit Bezugstemperaturen), Minderungen; Rechenkette: Q_N aus Tabellen (W/m je Typ×Höhe; W/Glied je Höhe×Tiefe/Säulen) → n aus **einer** Tabelle → Q(θ_VL) mit log. Übertemperatur → Raum: Σ Q/Φ_HL, θ_VL,req per **Bisektion** → Gebäude-Max → Ampel ≤55 / 55–65 / >65 °C → Massnahmen (Typ-Upgrade gleiche Nische, Länge, FBH, Hybrid) → `Ergebnis.auslegungsVL` speist Gerätefilter, Dashboard, Bericht. | `befund_heizkoerper.md §6`. |
| Backend | Cloudflare Pages Functions + D1 bleiben. Auth neu: HMAC-signiertes Cookie (`HEIZLAST_COOKIE_SECRET`), Ablauf, timing-safe Passwortvergleich, Rate-Limit; Projekte: Grössenlimit, ID-Format, optimistisches Locking (409 bei `updated_at`-Konflikt), 404 bei unbekannter ID. SQL aus `heizlast-projects.js` übernehmen. D1-Schema ins Repo. | BUILD-06–09, 12. |
| Daten | Nur in `data/*.json`, nie als Kopie im Code. Einheitliches `_meta { version, stand, quellen[] }`; jede Tabelle mit Quelle (Norm/Seite/Tabelle oder Datenblatt-URL + Datum). KI-Recherche ist keine Primärquelle. Schema-Tests je Datei. | DATA-01, 10. |
| Design | Farbpalette und die **eckige** Formensprache (Radien 0–4 px, wie im alten `style.css`) übernehmen; Layout, Navigation, Dichte, Komponenten frei neu. Tokens liegen seit Session 1 in `src/ui/styles/tokens.css`; **Radien wie auf Schritt 0 der neuen App sind von Daniel bestätigt (29.10., 16:34) und bleiben so.** | Daniel 29.10. |
| Sprache/Stil | UI und Doku Deutsch, Schweizer Schreibweise (ss, 23'000). Bezeichner: Domänensprache Deutsch, camelCase, Einheit im Namen wo nicht SI (`qhlKW` vermeiden → intern alles in W und °C, Formatierung nur in UI). Keine ß, keine «ae/oe/ue»-Umschreibungen in sichtbaren Texten. | CODE-22–27. |
| Zusatzmodule | Förderung, Bewilligung, Offerte: bestehende reine Module übernehmen, an neuen State anbinden, in separater Navigationsgruppe. Hydraulik-Schemas: zurückgestellt (nicht im Umfang). | CODE-10, `code-qualitaet.md §5`. |

## 3. Arbeitsregeln (Daniel, 2026-10-29)
1. **Vor jedem Eingriff Backup** des betroffenen Stands (ZIP/TGZ mit Zeitstempel nach `…\REVISION\_work\backups\`); bei Git: Commit vor Session-Start.
2. **Protokoll** `REVISION\PROTOKOLL.md`: je Session Datum, Prompt (Kurzform), Entscheide, Änderungen, Prüfresultat. Arbeits-Backups + Protokoll werden nach Abnahme gelöscht.
3. **Strikt sequentiell**: eine Session, ein Ziel, Abschluss + Prüfung (Definition of Done unten) vor der nächsten. Keine Parallelarbeit an denselben Dateien.
4. **Freiheit beim Umbau**, aber: felsenfeste Bausteine übernehmen; im Zweifel gewinnt das saubere neue System.
5. **Fragen** nur gebündelt und entscheidungsrelevant (max. 4 Runden gesamt; Stand 29.10.: 2 verbraucht).
8. **Kein Hotfix am alten Tool** (Daniel 29.10.): Session 0 entfällt, Live-Stand bleibt unverändert bis Go-Live.
9. **Ablauf:** je Session ein neuer Chat im Claude-Projekt «thermowerk», Modell laut PLAN wählen, Prompt aus PLAN.md §4 einfügen. Dieses KONTEXT.md liegt in der Projekt-Wissensbasis und wird in jedem Chat zuerst gelesen.
6. Doku an Daniel **als PDF oder Text im Chat**; für Claude als Markdown im Repo.
7. Nichts doppelt, nichts veraltet: ersetzte Dateien nach `_to_delete/`, keine Leichen.
10. **Daniel ist kein Entwickler** (Daniel 29.10., 16:34): Entwicklung, Backend, Deploy, Konfiguration und deren Prüfung sind zu 100 % Claudes Arbeit. Claude organisiert und prüft selbst — auch Funktionen in der laufenden App (Playwright, Fetch der Staging-URL, curl gegen die API). Daniel ist nur **Backup-Tester** (Klicks im Browser, fachliche Plausibilität) und prüft nichts, was Entwickler-Wissen braucht.
    - Wenn etwas dauert (Cloudflare-Build, DNS, Cache): einige Minuten warten, erneut prüfen; eine Session wird **erst abgeschlossen, wenn Claude das Ergebnis bestätigt hat** (z. B. Staging-URL liefert die neue Version). «Daniel bestätigt» ist nirgends Voraussetzung für «fertig».
    - Einstellungen im Cloudflare-Dashboard, in GitHub oder in Sanity nimmt Claude selbst vor (Browser-Tools), wenn möglich; nur wenn das nicht geht, bekommt Daniel eine Klickanleitung in Alltagssprache (wo klicken, was eintragen) — ohne Fachjargon. Geheimnisse (Secrets, Tokens) erzeugt Claude und sagt Daniel nur, wo sie einzutragen sind, falls Claude es nicht selbst kann.
    - Kommunikation mit Daniel: Klartext, Fachbegriffe beim ersten Auftauchen in einem Halbsatz erklären, Entscheidungen als Frage («Soll ich A oder B?»), keine Terminal-Befehle an Daniel.

## 4. Definition of Done je Session
- Ziel der Session erreicht und im Chat **knapp** berichtet (keine Aufzählung erledigter Schritte).
- `npm test` grün (Vitest), `npm run lint` ohne Fehler, `npm run build` erfolgreich; ab S7 zusätzlich Playwright-Smoke grün.
- Neue Fachlogik hat **externe** Referenztests (Kurslösung, Norm-Beispiel, Datenblatt), keine Zirkelschlüsse.
- Jeder neue Fallback liefert `Wert` mit Herkunft/Begründung; Property-Tests für Monotonie wo relevant.
- Commit mit sprechender Message; `PROTOKOLL.md` ergänzt; `README.md` im Repo aktuell (Architektur, Befehle, Datenquellen, offene Punkte).
- Keine Rechenlogik in `src/ui/`; keine Daten-Kopien im Code.
- **Deploy von Claude verifiziert**: nach Push warten, bis Cloudflare gebaut hat (Staging-URL `https://thermowerk.ch/heizlast-neu/` per Fetch prüfen: HTTP 200 und neuer Asset-Hash/Inhalt; bei Bedarf alle 1–2 Minuten erneut, bis bestätigt). Live `/heizlast/` weiterhin 200. Funktionen des Session-Ziels hat Claude selbst in der deployten App geprüft (Playwright gegen Staging oder Fetch). Daniel wird nur informiert, nicht als Prüfer vorausgesetzt (Regel 10).

## 5. Referenzmaterial (Pfade auf dem PC)
- Befund: `D:\Users\Daniel\Documents\Thermowerk\Heizlast Tool\REVISION\` (BEFUND.md, PLAN.md, KONTEXT.md, Teilberichte, shots/).
- Altes Tool (eingefroren): `…\Thermowerk\Heizlast Tool\src`, `data`, `tests`, `reference\BEISPIELRECHNUNG.md`, `reference\FWS-RECHENWEGE.md`, `reference\referenzhaus-*.json`.
- Wissensbasis: `…\Thermowerk\Wissensbasis\*.md` (A–N).
- FWS-Kursunterlagen: `D:\Samsung Kopie 2026\Wärmepumpe\*.pdf` (M3 Skript 95 S., Aufgaben + Lösungen, Foliensätze, Praxisbeispiele).
- Website-Repo: `D:\Users\Daniel\Documents\thermowerk-website\` (GitHub `dbcoltouan-ui/thermowerk-website`, Cloudflare Pages, D1 `thermowerk-data`).
- Nicht lesen (veraltet/aufgebläht): alte STAND.md, CHANGELOG.md, PLAN.md, *-GAMEPLAN.md, `research/research-*`, `website\CLAUDE.md`.
