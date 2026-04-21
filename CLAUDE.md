# Anweisung für Claude – Thermowerk Website

> **WICHTIG:** Diese Datei ist die zentrale Wissensbasis für Claude. Jede neue Funktion, jedes neue Schema, jeder neue Workflow oder jede architektonische Änderung MUSS hier dokumentiert werden, sobald sie umgesetzt ist. So bleibt Claude in jeder neuen Session sofort auf dem aktuellen Stand.

> **KOMMUNIKATION MIT DANIEL (WICHTIG):** Daniel ist **Laie** (kein Entwickler). Er versteht Code nicht, er versteht Terminal-Kommandos nicht automatisch, er hat kein Python installiert, er weiss nicht was ein „Commit", ein „Port" oder ein „fetch" ist. Claude muss daher:
> - **Jeden Schritt in Klartext erklären**, bevor ein Kommando genannt wird („Wir machen jetzt X, damit Y passiert, weil Z").
> - **Keine nackten Shell-Befehle** als Anweisung — immer mit Kontext: Wo eingeben (PowerShell / cmd / Browser), was passiert wenn's durchläuft, was passiert wenn nicht.
> - **Test-Anweisungen immer mit „wo klicke ich hin"** — nicht „öffne `http://localhost:8080`", sondern „Doppelklick auf die Datei `index.html` im Explorer, dann passiert …".
> - **Fachbegriffe kurz übersetzen** beim ersten Auftauchen („D1 = die Online-Datenbank von Cloudflare").
> - **Entscheidungen als Frage formulieren**, nie als technische Option-Liste: „Soll ich A oder B machen?" statt „Wähle zwischen `--flag=a` und `--flag=b`".
> - **Bei Commits und technischen Aktionen selbstständig durchführen** — Daniel muss nichts selbst in Terminals eintippen. Nur Tests (Klicks im Browser) laufen bei ihm.
> - **Knapp antworten bei Routine-Schritten**, ausführlich nur wenn Daniel fragt oder etwas Neues/Ungewöhnliches ansteht (User-Präferenz: „Bei Erledigung der Promts immer knapp antworten").

> **HANDOFF-KONVENTION:** Jede Handoff-Datei (`HANDOFF-PHASE-N.md`) muss **ganz oben** einen fertigen Copy-Paste-Prompt für den nächsten Chat enthalten (als ```-Block). Der Prompt verweist auf die jeweilige Handoff-Datei, nennt den aktuellen Stand, listet die zu lesenden Dokumente in Reihenfolge und gibt konkrete erste Schritte. Claude übergibt diesen Prompt am Ende einer Phase immer auch direkt im Chat, damit Daniel ihn 1:1 kopieren kann — ohne die Datei erst öffnen zu müssen.

> **AKTUELLES OFFENES PROJEKT: Heizlastrechner-Redesign** — Siehe `HANDOFF-HEIZLAST-REDESIGN.md` im Projekt-Root. Das Backend steht (Sanity-Schema, Cloudflare Functions, Auth, Env-Vars), aber der Frontend-Teil unter `/heizlast` wird komplett neu aufgebaut. Bei neuer Session zu diesem Thema zuerst `HANDOFF-HEIZLAST-REDESIGN.md` lesen.
>
> **Phase 1 abgeschlossen (2026-04-16):** Rechenkern als TypeScript portiert in `src/lib/heizlast/{types,constants,calculations}.ts`. 49 Regressions-Tests (FWS-Aufgaben 1–4 + eigenes Beispiel + Rückrechnung) laufen grün via `node --experimental-strip-types scripts/test-heizlast.ts`. Die Beispielrechnung ist dokumentiert in `reference/BEISPIELRECHNUNG.md`.
>
> **Phase 2 abgeschlossen (2026-04-16):** UI-Grundlagen und wiederverwendbare Primitives gebaut. `src/layouts/HeizlastLayout.astro` (schlanker Header mit Logo + Login-Button, minimaler Footer, eigene CSS-Tokens mit `--hz-*` Prefix, `.hz-scope` isoliert vom Marketing-Layout). `src/components/heizlast/` enthält `SectionWrapper`, `InfoBox` (Accordion mit Blue-tint, Icon-Varianten info/book/help), `KpiCard` (default + hero Variante), `OverrideField` (Stift-Icon zum Überschreiben, Delegated-Click-Handler per inline JS), `Toggle` (Pill-Chip +/− für optionale Module, kein offener leerer Content). Visuelle Abnahme über `src/pages/heizlast-sandbox.astro` (wird in Phase 4 entfernt). Design-Entscheidungen: OverrideField = Stift-Icon (User-Wahl A); InfoBox/KpiCard/Toggle = Claude-Empfehlung (best practices, Navy/Rot als Akzent, Off-White/White als Flächenfarbe). Tests weiterhin 49 grün.
>
> **Phase 3 abgeschlossen (2026-04-17):** State-Management + Persistierung komplett. Dependency: **Nano Stores** (`nanostores@^1.2`, ~1 kb). Vier neue Module in `src/lib/heizlast/`: `state.ts` (zentraler `map`-Store `heizlastState`, Typen für alle Sektionen, `updateSection`/`setField`/`replaceState`/`resetState`-Helper, `uiState` für Modal-/Auth-/Sync-Flags, `projectList` + `projectListLoaded`-Atoms), `storage.ts` (localStorage-Schicht mit Versionierung `thermowerk.heizlast.state.v1`, Debounced Auto-Save 500 ms, `bootFromStorage()` + `subscribeAutoSave()`, Cleanup alter Legacy-Keys), `projects.ts` (Wrapper für `/api/heizlast-projects` — `listProjects`/`loadProject`/`saveProject`/`deleteProject`/`probeAuth`, hält `projectList` live), `compute.ts` (derived store `heizlastCompute` über `runCascade()`, fährt M1→M2→M4→M3→M5→M6→M7→M8→M9 durch; WW-Abzug bei Verbrauchsmethode nutzt `qnwwJahr` inkl. Verlust-Faktoren). Neuer Testlauf `scripts/test-heizlast-state.ts` mit 16 Integrations-Tests (FWS-Aufgabe 2 via State → Qhl = 12.55 kW ✓, Sanierung multiplikativ, Qh-Summe konsistent, Serialisierung round-trip, Versionsmigration verwirft unbekannte States, SSR-Safety, WW-Speicher-Rundung). Phase-1-Tests weiterhin 49 grün. Sandbox (`/heizlast-sandbox`) hat neue Sektion "07 / Phase 3 — State live": Input-Feld `Ba` ist an den Store gebunden, vier KPI-Kacheln rendern Qhl/W/m²/Qh/WW-Speicher live aus `heizlastCompute`, Werte werden debounced in localStorage geschrieben. localStorage-Entscheidung: Neuer Key `thermowerk.heizlast.state.v1`, alte Keys werden beim Boot gelöscht.
>
> **Phase 4 abgeschlossen (2026-04-17):** Komplette UI — sieben Sektionen + Hauptseite + Binding-Infrastruktur. State um `RaumInput[]`, `raeumeAktiv`, `SectionNote`/`NotizenState` (pro Sektion Freitext + Export-Checkbox) erweitert (state.ts). Neues Modul **`src/lib/heizlast/bindings.ts`** — deklaratives Two-Way-Binding via `data-hz-bind="path.to.field"` + `data-hz-type="number|string|boolean"`: `bootBindings()` (idempotent, `window.__hzBindingsBound`), input/change-Listener Dom→Store, store.subscribe() Store→Dom; unterstützt input (number/text/date), checkbox, radio, select, textarea. `getPath` + `setPath` als pure Helpers (immutable update). Komponente **`src/components/heizlast/SectionNotes.astro`** — aufklappbarer Notiz-Toggle (textarea + Export-Checkbox, Badge „ausgefüllt"). Sieben Sektions-Komponenten in `src/components/heizlast/sections/`: Section1Gebaeude (Projekt-Kopf Navy + Stammdaten + EBF-Zimmer-Helfer), Section2Heizlast (fünf Methoden-Toggles mit rotem Active-Akzent + Sanierung + Plausi), Section3Warmwasser (Main-Switch + Radio-Methoden + drei Panes + Verluste), Section4Zuschlaege (toff + optionales Qas), Section5Auslegung (vier Summanden + grosser Qh-Block), Section6Speicher (WW | Puffer nebeneinander), Section7Projekt (Zusammenfassung Key-Value + Ergebnis-Block + Speichern-Buttons). Hauptseite **`src/pages/heizlast.astro`** — importiert `HeizlastLayout` und die sieben Sektionen, Glue-JS boot-reihenfolge (`bootFromStorage → subscribeAutoSave → bootBindings → syncDomFromState`), Event-Delegation für dynamische Listen (Zimmer, Sanierung, Personen-Einheiten), Methoden-Activation (Toggle-Open → `state.heizlast.method`), WW-Pane-Switching, Compute-Subscriber aktualisiert alle `[data-kpi]` + `[data-hz-sum]` + Plausi-Ampel (grün/gelb/rot). Save/Load-Buttons: local = Auto (Debounce 500 ms via storage.ts), cloud = disabled bis Auth (Phase 6). Sandbox (`heizlast-sandbox.astro`) gelöscht. Tests 49 + 16 grün. Build-Gegencheck auf Cloudflare offen (lokaler `astro check` läuft in Sandbox nicht wegen Rollup-Native-Mismatch). **Für Phase 5 (Executive Summary + Chart.js Leistungsdiagramm) neuer Chat — siehe `HANDOFF-PHASE-5.md`.**
>
> **Phase 5 abgeschlossen (2026-04-17):** Executive Summary + Leistungsdiagramm live. Dependency: **chart.js@^4**. Zwei neue Komponenten in `src/components/heizlast/`: **`ExecutiveSummary.astro`** — sticky Stat-Row direkt unter dem Layout-Header (`position: sticky; top: var(--hz-header-height)`, z-index 30), fünf Felder mit `[data-kpi]`-Slots: `qh` (Hero-Variante, rote Oberkante), `qhlKorr`, `plausi` inkl. Ampel-Punkt (gruen/gelb/rot via `data-ampel`-Attribut auf dem Stat-Wrapper), `wwSpeicher`, `puffer`. Wird automatisch von der bestehenden `setKpi()`-Logik in `heizlast.astro` befüllt — kein Umbau von `renderAll()` nötig. Responsive (flex-wrap ab 900 px, 2 Spalten ab 560 px). **`LeistungsDiagramm.astro`** — eigene Sektion „05a — Leistungsdiagramm" zwischen Section5Auslegung und Section6Speicher (tone=off). Chart.js-Liniendiagramm mit vier Datasets: Gebaeude-Heizkennlinie (rot, linear von `(θne, Qhl)` bis `(θGT, 0)`), WP-Kennlinie (navy, lineare Interpolation durch fünf Stützpunkte, tension 0.25), Auslegungspunkt-Marker `(θne | Qh)` und Bivalenzpunkt (automatisch via Bisektion auf `f(θ) = gebaeude(θ) − wp(θ)`, grüner Kreis). Drei vordefinierte Modell-Varianten (klein ~6 kW / mittel ~9 kW / gross ~12 kW bei A2/W35) als Dropdown + Option „Eigene Werte"; die fünf Stützpunkte (−15/−7/2/7/12 °C) sind in einem `<details>`-Formular einzeln editierbar (manuelle Änderung schaltet Variante automatisch auf „Eigene Werte"). Zusätzlich Inputs für θGT und θne, Reset-Button auf Standard. Meta-Zeile unter dem Canvas zeigt Qhl bei θne, Qh und Bivalenzpunkt in Klartext. Datenquelle: `heizlastCompute.subscribe()` + `heizlastState.subscribe()` — Diagramm reagiert live auf alle Eingaben. InfoBox erklärt Bivalenzpunkt und Leseanleitung. SectionNotes für `sektion5` wiederverwendet (Notiz wird in Phase 6 separat für Diagramm verdrahtet). `heizlast.astro` importiert und platziert `ExecutiveSummary` vor `<Section1Gebaeude />`, `LeistungsDiagramm` nach `<Section5Auslegung />`. Tests weiterhin 49 + 16 grün. **Für Phase 6 (Login-Modal + Projekt-Liste-Modal + PDF-Export) neuer Chat — siehe `HANDOFF-PHASE-6.md`.**
>
> **Phase 9 / Block A abgeschlossen (2026-04-17):** Override-Infrastruktur. (a) **`src/lib/heizlast/state.ts`** — `overrides: Record<string, boolean>` in `HeizlastState` + `createDefaultState()`. Neue Exporte: `OverrideFieldPath` (Union der aktuell unterstützten Pfade), `resolveDefault(state, path)` (liefert den abgeleiteten Default via tvoll-Lookup / PHYSIK / Konstanten), `setOverride(path, on)`, `clearOverride(path)`, `isOverridden(state, path)`. Setter markieren `isDirty`. (b) **`src/lib/heizlast/storage.ts`** — sanfte v1→v1-Migration: fehlendes `overrides`-Feld in alten localStorage-States wird beim Laden auf `{}` gesetzt (kein Versions-Bump). (c) **`src/components/heizlast/OverrideField.astro`** — komplett neu: Feld ist IMMER editierbar und zeigt den aktuellen Wert (User oder Default). Neue Props `bindPath` + optional `overridePath` (Default = bindPath). Wrapper trägt `data-hz-override-field={ovrPath}` + `data-default={String(defaultValue)}`. Reset-Pfeil rechts per `visibility: hidden` ausgeblendet und nur sichtbar wenn Wrapper `.is-overridden` hat. Klick ruft `window.__hzClearOverride(path)` + `window.__hzResolveDefault(path)`, schreibt den Default ins Feld und feuert synthetische `input`/`change`-Events. (d) **`src/lib/heizlast/bindings.ts`** — Event-Handler erkennt per `ev.isTrusted`, ob eine User-Änderung aus einem `[data-hz-override-field]`-Wrapper kommt und ruft dann `setOverride(path, true)`. Synthetische Events (Reset) werden ignoriert. Neuer Export `syncOverrideClasses(root)` synchronisiert `.is-overridden` passend zum `overrides`-Record; Store-Subscriber + initialer Sync nach `bootBindings()`. (e) **`src/pages/heizlast.astro`** — direkt nach Boot-Reihenfolge zwei Globals installiert: `window.__hzClearOverride(path)` → `clearOverride(path)`; `window.__hzResolveDefault(path)` → `resolveDefault(state, path)` als String oder null. Tests weiterhin **49 + 16 grün**.
>
> **Phase 9 / Block M abgeschlossen (2026-04-17):** Mobile-Polish — Worttrennung + Logo. (a) **`src/layouts/HeizlastLayout.astro`** — `<span class="hz-brand__text">Thermowerk</span>` im Header-Brand komplett entfernt (HTML + CSS-Regel + die bisherige `.hz-brand__text { display: none }` Mobile-Ausblendung). Nur das Logo bleibt stehen. (b) Mobile-Logo von 26 px auf 32 px hoch, Header-Height Mobile von 58 px auf 60 px — Container wird nicht mehr gestaucht. (c) Neue globale Worttrennungs-Regel auf `.hz-scope`: `hyphens: manual; overflow-wrap: break-word; word-break: normal;` — verhindert mid-word-Breaks, verlangt explizite Soft-Hyphens. Zusatzregel auf H1/H2/H3, `.hz-section__title`, `.hz-section__subline`, `.hz-kicker`: `text-wrap: balance` für gleichmässige Umbrüche. Der Mobile-Block aus Phase 8 mit `overflow-wrap: anywhere` wird durch einen nachfolgenden Block mit `break-word` überschrieben (gleiche Spezifität, Quellreihenfolge entscheidet). (d) Desktop-Logo ist durch Block M1 (`--hz-container-max` auf `.hz-topbar__inner` + `.hz-container`) bereits bündig mit der Content-Kante. Tests weiterhin **49 + 33 grün**.
>
> **Phase 9 / Block M2 abgeschlossen (2026-04-17):** 12-Spalten-Grid + intrinsische Feldbreiten. (a) **`src/layouts/HeizlastLayout.astro`** — neue Utility-Klassen: `.hz-row` (`display: grid; grid-template-columns: repeat(12, minmax(0, 1fr))`) + `.hz-col-3/4/6/8/12` mit `grid-column: span N`. Auf Breakpoint `≤720 px` werden alle `.hz-col-*` automatisch auf `span 12` gesetzt; `.hz-row` gap wird mobile kleiner. (b) **Intrinsische Feldbreiten** per max-width: Neue Tokens `--hz-input-max-number: 240px`, `--hz-input-max-select: 320px`, `--hz-input-max-unit: 220px` im `:root`. Default-Regeln: `.hz-field__input-with-unit` max 220 px, `.hz-field:not([data-size]) > .hz-field__input[type="number"]` max 240 px, `.hz-field:not([data-size]) > select.hz-field__input` max 320 px. Text-Inputs (Projektname, Anschrift) bleiben full-width. (c) Fein-Override via `data-size="xs|sm|md|lg|full"` auf dem `.hz-field`-Wrapper (120/180/280/420/100%). (d) Mobile-Override `@media (max-width: 720px)` setzt alle `.hz-field__input` und `.hz-field__input-with-unit` wieder auf `max-width: 100%`. (e) Toggle-Button war bereits `display: inline-flex` auf Desktop → kein Eingriff nötig. (f) Kein Mass-Refactor der Section-Komponenten — die bestehenden `.hz-grid-2`/`.hz-grid-3` Wrapper bleiben, die Begrenzung greift intrinsisch am Input. Tests weiterhin **49 + 33 grün**.
>
> **Phase 9 / Block M1 abgeschlossen (2026-04-17):** Desktop-Breite reduziert + fluide Typografie. (a) **`src/layouts/HeizlastLayout.astro`** — vier neue Tokens im `:root`: `--hz-container-max: min(92vw, 960px)` (zentrale Container-Breite, skaliert mit Viewport aber nie über 960 px), `--hz-gap-section: clamp(56px, 8svh, 88px)`, `--hz-gap-row: clamp(16px, 2.2vw, 28px)`, `--hz-gap-card: clamp(10px, 1.4vw, 18px)`. (b) `.hz-container { max-width: var(--hz-container-max) }` — vorher fest 1120 px. (c) `.hz-topbar__inner { max-width: var(--hz-container-max) }` — vorher 1160 px. Damit sitzen Header und Content-Block linksbündig, auf 1440–1920 px entstehen ruhige Ränder. (d) Body-Schrift leicht fluid: `.hz-scope { font-size: clamp(15.5px, 0.35vw + 14.8px, 17px) }` — vorher fix 16 px. (e) **`src/components/heizlast/SectionWrapper.astro`** — `padding: var(--hz-gap-section, …)` statt der Literalformel. (f) **`src/components/heizlast/KpiCard.astro`** — Default-Variante: `.hz-kpi__value { font-size: clamp(24px, 2.2vw, 30px) }` (vorher 28 px fix), `.hz-kpi__unit { font-size: clamp(13px, 1vw, 15px) }`. Hero-Variante war bereits fluid. Mobile-Verhalten aus Phase 8 unverändert. Tests weiterhin **49 + 33 grün**.
>
> **Phase 9 / Block L abgeschlossen (2026-04-17):** Notizen-Block schlanker. (a) **`src/lib/heizlast/state.ts`** — `SectionNote` auf `{ text: string }` reduziert (kein `includeInExport`-Feld mehr). `NotizenState` bekommt einen neuen Slot `projekt: SectionNote`; der alte `sektion7`-Eintrag wird dabei fallen gelassen. `setNoteExport()` gestrichen, `emptyNote() = { text: '' }`, `defaultNotizen()` listet `sektion1..sektion6 + projekt`. (b) **`src/lib/heizlast/storage.ts`** — sanfte v1→v1-Migration in `migrateIfNeeded()`: alter `sektion7.text` wandert nach `projekt.text` (wenn dort noch nichts steht); `includeInExport` wird ignoriert; fehlende Slot-Keys bekommen `{ text: '' }`. Kein Versions-Bump. (c) **`src/components/heizlast/SectionNotes.astro`** — Key-Union auf `'sektion1'..'sektion6' | 'projekt'` erweitert. `.hz-note__badge` („ausgefüllt") entfernt, stattdessen `.hz-notes__indicator` (kleines Navy-Info-Kreis-SVG), nur sichtbar wenn `text.length > 0`. Export-Checkbox pro Notiz gestrichen. Wrapper trägt `data-hz-note-slot={sectionKey}` als Hook fürs Print-CSS. Label `Projekt-Notiz` bei `sectionKey === 'projekt'`. Script: neuer Guard `__hzNotesIndicatorBound`, `refresh()` setzt `indicator.hidden = !has`. (d) **`src/components/heizlast/sections/Section7Projekt.astro`** — `<SectionNotes sectionKey="sektion7" … />` → `<SectionNotes sectionKey="projekt" />`. (e) **`src/components/heizlast/ExportModal.astro`** — die bisherige `notizen`-Checkbox durch zwei neue ersetzt: `notizenBereiche` + `notizenProjekt` (beide default `checked`). (f) **`src/lib/heizlast/export.ts`** — `ExportPart`-Union auf `notizenBereiche | notizenProjekt` aktualisiert; `PART_CLASS` ergänzt um `hz-print-notizen-bereiche-on` + `hz-print-notizen-projekt-on`. (g) **`src/layouts/HeizlastLayout.astro`** — Print-CSS um drei Regeln erweitert: keine der beiden Klassen aktiv → alle `.hz-notes` versteckt; nur `…bereiche-on` aktiv → `.hz-notes[data-hz-note-slot="projekt"]` versteckt, alles andere sichtbar; nur `…projekt-on` aktiv → umgekehrt. (h) **`src/pages/heizlast.astro`** — Default-`parts`-Record und alle Event-Handler auf die beiden neuen Keys umgestellt. Tests weiterhin **49 + 33 grün**.
>
> **Phase 9 / Block K abgeschlossen (2026-04-17):** Heizungspuffer — Abtau als CH-Standard. `Section6Speicher.astro` Methoden-`<select>` neu geordnet: `abtau` steht zuerst und ist mit „— Standard CH" markiert; `takt`/`sperrzeit`/`err` folgen in dieser Reihenfolge. Neuer `<small class="hz-muted">`-Hint unter dem Select: „In CH am häufigsten: **Abtau** (Luft-Wasser-WP). Für EVU-gesperrte Anlagen **Sperrzeit-Reserve**." Default `speicher.pufferMethod = 'abtau'` war bereits in `state.ts` gesetzt (keine Änderung nötig). Sperrzeit bleibt als gleichwertige Auswahl für EVU-gesperrte Anlagen verfügbar, aber nicht mehr ranggleich präsentiert. Tests weiterhin **49 + 33 grün**. **Nächste Session: `HANDOFF-PHASE-15.md` lesen → Bundle 2 (Blöcke L + M1 + M2 + M).**
>
> **Phase 9 / Block J abgeschlossen (2026-04-17):** Speicher-Rundung marktrealistisch + Recherche-Doc. (a) Neues Dokument **`reference/SPEICHER-MARKT-CH.md`** — Markt-Analyse CH-Hersteller (Hoval, Viessmann, Stiebel Eltron, Domotec, Jenni) mit Rundungs-Empfehlungen und Quellen-Liste. (b) **`src/lib/heizlast/calculations.ts`** — neue Funktion `rundeSpeicherMarkt(volumenL, kind: 'ww' | 'puffer')`: WW staffelt in 50/100/250/500-L-Schritten (je nach Volumen-Band), Puffer in 50/100/200-L-Schritten; **immer aufrunden** (`Math.ceil`), damit die Auslegung nie zu klein wird. Alte `rundeSpeicher(v, step)` bleibt als Legacy-Export. In `formulas`-Sammel-Export ergänzt. (c) **`src/lib/heizlast/compute.ts`** — `computeWwSpeicher` und `computePuffer` nutzen jetzt `rundeSpeicherMarkt(roh.value, 'ww'|'puffer')`; die alten `wwRundungLiter` / `pufferRundungLiter` Felder werden ignoriert (`void ...` als Marker), bleiben im State für Kompatibilität. (d) **`Section6Speicher.astro`** — beide `<fieldset class="hz-radio-group"><legend>Rundung</legend>…`-Blöcke (WW + Puffer) entfernt. Stattdessen neue Empfehlungs-Zeile `<p class="hz-storage-recommendation">` mit „Berechnungswert X L · Empfehlung Y L (marktübliche Staffelung)"; Slots `data-hz-sum="wwSpeicherRoh|pufferRoh"` (Berechnung) und `data-hz-sum="wwSpeicher|puffer"` (Empfehlung, rot hervorgehoben). Neue CSS-Klassen `.hz-storage-recommendation` (dashed Navy-Border, Off-White-BG), `.hz-rec-value` (rot, bold). (e) **`src/pages/heizlast.astro`** — `renderAll()` schreibt zusätzlich `wwSpeicherRoh` und `pufferRoh` in die neuen Sum-Slots (via `r.wwSpeicherRoh?.value` / `r.pufferRoh?.value`). (f) **`scripts/test-heizlast-state.ts`** — WW-Speicher-Integrationstest umgeschrieben: prüft dass `wwSpeicherGerundet` exakt auf der passenden Band-Stufe liegt (50/100/250/500) und `>= roh.value` ist (Aufrundung). Neue Summe: **49 + 33 grün**.
>
> **Phase 9 / Block I abgeschlossen (2026-04-17):** Save-Block entschlackt + Confirm/beforeunload. (a) **`src/components/heizlast/sections/Section7Projekt.astro`** — `.hz-save-block` aufgeräumt: Cloud-Buttons („Speichern", „Als neues Projekt speichern", „Projekte öffnen") in eigenem Wrapper `<div class="hz-save-actions__cloud" data-hz-auth-only>`, der via neuer CSS-Regel `body:not(.is-auth) [data-hz-auth-only] { display: none !important; }` nur für authentifizierte User sichtbar ist. „Neues Projekt"-Button von `hz-btn-danger-soft` (mit Trash-SVG) auf `hz-btn-ghost` zurückgesetzt — kein destruktiver Akzent. Zeile „Letzte Cloud-Speicherung: …" komplett entfernt (`data-hz-save-cloud`-Slot + JS-Handler raus). Die ausführliche `<InfoBox title="Wie werden Projekte gespeichert?">`-Erklärbox entfernt (InfoBox-Import auch raus). Mobile-Breakpoint angepasst: `.hz-save-actions__cloud` jetzt mit `flex-direction: column` und 100%-Buttons. (b) **`src/pages/heizlast.astro`** — `saveCloudEl`-Handler ersatzlos entfernt (Status-Pill reicht als Feedback). `newProjectBtn`-Handler auf Event-Delegation umgestellt (mehrere Buttons können Trigger sein) und um reichhaltigen Confirm-Dialog erweitert: zeigt Warnung bei ungespeichertem Dirty-State, bietet Export-Alternative an („OK = Neues Projekt · Abbrechen + Export: erst abbrechen, dann Export verwenden") — bei Abbrechen-Klick zweiter Confirm „Projekt vorher exportieren (PDF oder JSON)?", der direkt `openExportModal(btn)` aufruft. (c) Neuer globaler `beforeunload`-Listener: wenn `uiState.isAuthenticated && isDirty.get() && !syncInFlight` → Browser-Warnung (`ev.preventDefault(); ev.returnValue = ''`). Verhindert Datenverlust bei versehentlichem Tab-Schliessen für eingeloggte User mit ungespeicherten Cloud-Änderungen. Tests weiterhin **49 + 32 grün**.
>
> **Phase 9 / Block H abgeschlossen (2026-04-17):** Plausibilität always-on + Export-Checkbox. (a) **`src/components/heizlast/sections/Section2Heizlast.astro`** — der gesamte `<Toggle label="Plausibilität (W/m²) prüfen" …>`-Block entfernt; Plausi ist jetzt konstant aktiv (kein Opt-in mehr). Plausi-KpiCard trägt neu `data-hz-plausi` als Hook für Print-Filter: `<KpiCard label="W / m²" … data-kpi="plausi" data-hz-plausi />`. (b) **`src/layouts/HeizlastLayout.astro`** — neue Print-CSS-Regel im `@media print`-Block: `body.hz-print-mode:not(.hz-print-plausi-on) [data-hz-plausi] { display: none !important; }` — Plausi wird nur exportiert, wenn die entsprechende Checkbox im Export-Modal gesetzt ist. (c) **`src/lib/heizlast/state.ts`** — `plausiActive` bleibt als Legacy-Feld (State-Kompatibilität), aber der Kommentar markiert: „Phase 9 / Block H: always-on, Feld bleibt als Legacy." Keine Runtime-Auswertung mehr. Tests weiterhin **49 + 32 grün**.
>
> **Phase 9 / Block G abgeschlossen (2026-04-17):** Label-Pattern + knappe Erklärungen. Durchgang durch alle Sektions-Komponenten: konsistente Label-Pattern (Titel-Ober-Label + Symbol-Subtitel wo sinnvoll), Hints/Quellen aufgeräumt. Keine Rechenlogik-Änderung, keine State-Änderung. Tests weiterhin **49 + 32 grün**. (Details in den einzelnen `Section*.astro`-Diffs des Block-G-Commits.)
>
> **Phase 9 / Block F abgeschlossen (2026-04-17):** Section 5 entfernt + Endergebnis in Section 7 + Umnummerierung 1–6. Die alte Section 5 („Auslegung — vier Summanden + grosser Qh-Block") wurde komplett aufgelöst: der Qh-Endergebnis-Block wanderte in Section 7 („Projekt / Zusammenfassung"), die vier Summanden-KPIs (`qhlKorr`, `qw`, `qoff`, `qas`) wurden entweder redundant mit Section-Wrapper-Asides oder in die Executive-Summary-Stub-Logik integriert. Alle Section-IDs und Kicker-Nummern 1–7 → 1–6 umnummeriert; Diagramm-Sektion bleibt als `05a` vorläufig erhalten (wird in spaterer Phase auf `04a` oder ähnliches normalisiert). Referenzen in `src/pages/heizlast.astro` (Imports, Mount-Reihenfolge, `renderAll()`-Slots) und in `src/lib/heizlast/state.ts` `NotizenState` (Sektion-Schlüssel) angepasst. Tests weiterhin **49 + 32 grün** — keine Rechenlogik-Änderung, reines UI-Refactoring.
>
> **Phase 9 / Block E abgeschlossen (2026-04-17):** EBF-Helfer erweitert — beheizt/unbeheizt + direkte Flächeneingabe. (a) **`src/lib/heizlast/state.ts`** — `RaumInput` um `flaecheDirekt: number | null` und `beheizt: boolean` erweitert; `laenge`/`breite` jetzt `number | null` (Unterschied "nicht gesetzt" vs. "0"). `flaecheOverride` bleibt als Legacy-Feld. Neue Exporte: `raumFlaeche(r)` (flaecheDirekt > flaecheOverride > L·B) und `sumRaumFlaechenNetto(raeume)` → `{ beheizt, unbeheizt, netto }` (netto = beheizt, unbeheizt nur informativ). `sumRaumFlaechen()` bleibt als Alias auf `.netto`. `addRaum()` setzt Defaults `beheizt=true`, `flaecheDirekt=null`, `laenge/breite=null`. (b) **`src/lib/heizlast/storage.ts`** — sanfte v1→v1-Migration alter RaumInput-Einträge: laenge/breite → `number|null`, fehlendes `flaecheDirekt = null`, fehlendes `beheizt = true`. Kein Versions-Bump. (c) **`src/components/heizlast/sections/Section1Gebaeude.astro`** — Tabelle um zwei Spalten erweitert ("Fläche direkt" m², "Beheizt" Checkbox); Grid 7 Spalten (`1.4fr 0.9fr 0.9fr 0.9fr 0.9fr 58px 44px`). Neue dreigliedrige Summenzeile `#hz-raum-sum-beheizt / #hz-raum-sum-unbeheizt / #hz-raum-sum-value` mit Text "beheizt: X m² · abgezogen (unbeheizt): Y m² · Netto-EBF: X m²". CSS: `data-direkt="true"`-Zeile dämpft L/B visuell ab, `data-beheizt="false"`-Zeile grauer Hintergrund, Mobile-Breakpoint 640 px mit `grid-template-areas`. Subline aktualisiert. (d) **`src/pages/heizlast.astro`** — `renderRaumList()` rendert alle 7 Spalten via `raumFlaeche(r)` + `sumRaumFlaechenNetto()`; Live-Modus übernimmt `agg.netto`. Event-Delegation um `flaecheDirekt` erweitert, `beheizt` via `change`-Handler. Neuer Helper `parseRaumNumber(value)` → `null` bei leerem Input. "Übernehmen"-Button schreibt `agg.netto` in `gebaeude.ebf`. (e) **`scripts/test-heizlast-state.ts`** — zwei neue Sektionen: "Block E — EBF-Helfer" (6 Asserts: Netto-Summen, flaecheDirekt-Vorrang, leerer Raum→0) und "Migration alter RaumInput" (7 Asserts: beheizt=true default, flaecheDirekt=null default, laenge/breite erhalten, Netto korrekt). Neue Summe: **49 + 32 grün**. **Stolperstein in dieser Session:** FUSE-Mount-Drift auf `test-heizlast-state.ts` (Linux sah 6655 B, Windows 9679 B); Tests über Desktop Commander auf Windows-Seite ausgeführt (`C:\Progra~1\nodejs\node.exe --experimental-strip-types`), Stdout in Log-Datei umgeleitet und via `Read`-Tool zurückgelesen. **Nächste Session: `HANDOFF-PHASE-14.md` lesen → Block F (Section-5-Entfernung + Endergebnis-Block in Section 7 + Sektions-Umnummerierung 1–6).**
>
> **Phase 9 / Block D abgeschlossen (2026-04-17):** Sperrzeit-Toggle + Qas-Klarstellung. (a) **`src/lib/heizlast/state.ts`** — neues Feld `zuschlaege.sperrzeitActive: boolean` (Default `false`). `qasActive` bleibt als Legacy-Field erhalten, wird aber von `compute.ts` nicht mehr ausgewertet (Kommentar im Interface markiert). (b) **`src/lib/heizlast/compute.ts`** — `computeQoff()` gated auf `sperrzeitActive`: wenn `false`, return `{ value: 0, steps: [{ formel: 'Qoff', wert: 'keine Sperrzeit — 0 kW' }] }`. `runCascade` addiert `qas` automatisch in `Qh` wenn `qas > 0` (kein Gate mehr). (c) **`src/lib/heizlast/storage.ts`** — sanfte Migration: alte States ohne `sperrzeitActive` bekommen `sperrzeitActive = (toff > 0)` beim Laden (kein Versions-Bump). (d) **`src/components/heizlast/sections/Section4Zuschlaege.astro`** — Sperrzeit Ja/Nein-Toggle oben (`data-hz-bind="zuschlaege.sperrzeitActive"`). `toff`-OverrideField liegt in `.hz-sperrzeit-block`, per CSS nur sichtbar wenn `body.hz-sperrzeit-on`. Qas umbenannt zu "Qas — Verbundene Systeme" mit Hints (Pool 1–3 kW, Lüftung 0.3–0.8 kW); `qasActive`-Toggle entfernt. InfoBox-Titel "Sperrzeit-Zuschlag". (e) **`src/pages/heizlast.astro`** — `renderAll()` setzt `document.body.classList.toggle('hz-sperrzeit-on', !!s.zuschlaege.sperrzeitActive)`. `qasEff = (qas > 0 ? qas : 0)` ersetzt das alte `qasActive`-Gate. (f) **`scripts/test-heizlast-state.ts`** — neue Block-8-Sektion "Sperrzeit-Toggle": Gate off → Qoff=0; Gate on mit toff=2 → Qoff>0; `qas=0.75` → Qh steigt exakt um 0.75 (unabhängig von `qasActive`). FWS-Aufgabe-2-Test erzwingt jetzt `sperrzeitActive = true` (Aufgabe hat toff=2). Neue Summe: **49 + 19 grün**. (g) **`.gitignore`** um `_backup-*.zip` ergänzt. **Stolperstein in dieser Session:** FUSE-Mount-Drift nach Python-Rewrite-Versuch; Recovery via Linux-Heredoc mit `\u2014`-Escapes, anschliessend per `sed -i 's|\\!|!|g'` die Bash-History-Expansion-Artefakte entfernt. **Nächste Session: `HANDOFF-PHASE-13.md` lesen → Block E (EBF-Helfer: beheizt/unbeheizt + direkte Flächeneingabe).**
>
> **Phase 9 / Block C abgeschlossen (2026-04-17):** Warmwasser-Defaults zentralisiert + UI-Beschriftung konsolidiert. (a) **`src/lib/heizlast/constants.ts`** — zwei neue Exporte: `WW_VERLUSTE_DEFAULTS = { speicher: 10, zirk: 0, ausstoss: 15 }` (Quelle FWS §8 / SIA 385/1, typische Ranges im Docstring) und `WW_SPEICHER_DEFAULTS = { tEintritt: PHYSIK.t_kaltwasser, tAustritt: 60 }` (Quelle FWS §10, Legionellen-Hygiene). (b) **`src/lib/heizlast/state.ts`** — `resolveDefault()` bezieht alle WW-Verlust-Prozente + Speicher-Temperaturen jetzt aus den Konstanten (keine Literale mehr); `createDefaultState()` schreibt `warmwasser.speicherProzent|zirkProzent|ausstossProzent` und `speicher.wwTStoAus` ebenfalls aus den Konstanten. Default-State zeigt also gleich beim ersten Laden 10 % / 0 % / 15 % / 60 °C — keine `null`-Prozente mehr. (c) **`Section3Warmwasser.astro`** — Labels sprachlich gleichgezogen: "Speicher-Verlust" → "Speicherverluste", "Zirkulations-Verlust" → "Zirkulationsverluste", "Ausstoss-Verlust" → "Ausstossverluste", "ΔT Kaltwasser → WW" → "ΔT Kaltwasser → Warmwasser". Quelle bei den drei Verlusten von "SIA 385/1" auf "FWS §8" umgestellt; DeltaT bleibt "SIA 385/2". Alle vier OverrideFields haben jetzt Hints mit typischen Ranges (Speicher 5-15 %, Zirk 0-20 %, Ausstoss 10-20 %) bzw. der physikalischen Begründung. (d) **`Section6Speicher.astro`** — "Speicher-Austrittstemperatur" → "Speicher-Solltemperatur (Austritt)" mit Hint "Legionellen-Hygiene: mind. 55 °C. Standard FWS: 60 °C."; "Eintritt (Kaltwasser)" → "Kaltwasser-Eintrittstemperatur" mit Hint "Referenzwert Kaltwasser: 10 °C."; Quelle Austritt von "SIA 385/2" auf "FWS §10". (e) Personen-Einheiten (`vwui`, `anf`) bleiben bewusst als reine User-Eingaben — projekt-spezifisch, kein Default-Nutzen. Tests weiterhin **49 + 16 grün**. **Stolperstein in dieser Session:** FUSE-Mount-Drift auf `constants.ts` und `state.ts` (Windows-Edit war durch, Linux-Mount sah abgeschnittenen Stand mit NUL-Bytes am Ende, `wc -l` meldete kürzere Datei als Windows-Read); Fix via `python3 -c "rstrip(b'\\x00').rstrip()"` + Dedup-Edit. **Nächste Session: `HANDOFF-PHASE-12.md` lesen → Block D (Sperrzeit-Toggle + Qas-UI).**
>
> **Phase 9 / Block B abgeschlossen (2026-04-17):** Methodenwahl entfernt, Auto-Erkennung steht, OverrideField-Migration aus Block-A-Rest komplett. (a) **`src/lib/heizlast/state.ts`** — `HeizlastMethod`-Union entfernt, neuer `HeizlastMethodsEnabled`-Record (`{ verbrauch, messung, bstd, override: boolean }`). `bauperiode` ist NICHT im Record (immer Fallback). `HeizlastSectionState.method` → `methodsEnabled`; Default: alles `false`. (b) **`src/lib/heizlast/storage.ts`** — sanfte Migration alter `heizlast.method`-Strings in den neuen Record (`method === 'verbrauch'` → `{verbrauch: true, …}` etc.); alter `method`-Key wird entfernt. (c) **`src/lib/heizlast/compute.ts`** — `computeQhlRaw()` auf Hierarchie-Logik umgebaut: `override` → `bstd` → `messung` → `verbrauch` → `bauperiode`. Einzelne Helper-Funktionen (`qhlVerbrauch`, `qhlMessung`, `qhlBstd`, `qhlBauperiode`, `qhlOverride`) liefern null bei unvollständigen Eingaben; die Hierarchie nimmt das erste gültige Ergebnis. `bauperiode` läuft IMMER als Fallback, auch wenn der Record komplett leer ist. FWS-Aufgabe-2-Regressionstest weiterhin bei 12.55 kW (Test auf `methodsEnabled.verbrauch = true` umgestellt). (d) **`src/components/heizlast/sections/Section2Heizlast.astro`** — pro Methode (ausser Bauperiode) ein „Diese Methode verwenden"-Switch oben im Panel (`data-hz-bind="heizlast.methodsEnabled.<methode>"`). Das alte `data-active`-Attribut, die CSS-Regeln für roten `::before`-Balken, `::after`-Pill und `.hz-method__badge` sind komplett entfernt; neuer CSS-Block `.hz-method__switch` (Navy-Hervorhebung via `:has(input:checked)`). InfoBox-Text zeigt jetzt die Hierarchie. (e) **`src/pages/heizlast.astro`** — Glue-Block `syncMethodToggles()` + Click-Handler, der `state.heizlast.method` beim Toggle-Open schrieb, komplett entfernt. Die neuen Checkboxen werden von `bindings.ts` automatisch versorgt. (f) **OverrideField eingesetzt in vier Sektionen:** Section 1 (`gebaeude.tvollOverride` / `gebaeude.tvoll`), Section 3 (`warmwasser.speicherProzent|zirkProzent|ausstossProzent` / `warmwasser.speicher|zirk|ausstoss` und `warmwasser.deltaTOverride` / `warmwasser.deltaT`), Section 4 (`zuschlaege.toff`), Section 6 (`speicher.wwTStoAus` / `speicher.wwTAustritt` und `speicher.wwTStoEinOverride` / `speicher.wwTEintritt`). Alle bisherigen `<input>`-Elemente in diesen Stellen sind durch `<OverrideField />` ersetzt; die `resolveDefault`-Cases in `state.ts` decken alle eingesetzten Override-Pfade bereits ab. (g) **`src/lib/heizlast/bindings.ts`** — zwei `\!`-Artefakte (Zeilen 151/238) aus einem vorherigen Heredoc-Patch zu `!wrapper` / `!path` repariert. Tests weiterhin **49 + 16 grün**. **Nächste Session: `HANDOFF-PHASE-11.md` lesen → Block C (Warmwasser-Defaults + Beschriftung).**
>
> **Nächster Schritt: Phase 9 — UX-Refactor (offen, 2026-04-17)** — Umfangreiche Änderungen an Defaults, Methodik-Modell, EBF-Helfer, Label-Pattern, Speicher-Rundung, Save-Block, Notizen, Mobile-Fixes, Logo-Proportionen. Kompletter Brief mit Copy-Paste-Prompt, Code-Pointern und Acceptance-Kriterien steht in `HANDOFF-PHASE-9.md` im Projekt-Root. **Bei neuer Session zu diesem Thema: zuerst `HANDOFF-PHASE-9.md` lesen, dann Blöcke A–M der Reihe nach umsetzen.**
>
> **Phase 8 abgeschlossen (2026-04-17):** UX-Feinschliff und Header-Redesign. (a) **Unicode-Fix** — 147 `\uXXXX`-Escapes in acht UI-Dateien (`HeizlastLayout.astro`, `heizlast.astro`, alle Section-Komponenten, `LeistungsDiagramm.astro`) via Python-Regex durch echte UTF-8-Zeichen ersetzt (ä/ö/ü/ß/η/θ/°). (b) **Sticky-Header neu** — `HeizlastLayout.astro` Header komplett umgebaut: Drei-Spalten-Grid `auto 1fr auto` (Logo | Projektname+Meta-Zeile | Aktions-Buttons). Mitte zeigt live `state.projectName` (`[data-hz-header-project]`) + Kunde · Adresse (`[data-hz-header-meta]`) aus `renderAll()`. Rechts jetzt vier Icon-Buttons: Save-Cloud (primary, rot), Projekte öffnen, Exportieren, Login/Logout — alle mit `aria-label` und SVG-Icons. Neue Klassen `.hz-btn-icon` + `.hz-btn-icon--primary`. KPIs sind **nicht** mehr im Header. (c) **ExecutiveSummary entfernt** — Komponente als Deprecation-Stub belassen (Mount erlaubt kein Löschen), Import + Render aus `heizlast.astro` raus. Die Live-KPI-Werte werden weiterhin durch `renderAll()` in Section 5 und Section 7 geschrieben. (d) **Section 1** — `.hz-proj` von Navy auf Blue-Tint umgestellt (`background: var(--hz-blue-tint)`, dunkle Schrift); `<slot name="aside">` mit Tvoll-KpiCard entfernt, KpiCard-Import raus. (e) **Section 2 Active-State** — Aktiver Methoden-Toggle jetzt auch collapsed erkennbar: `.hz-toggle[data-active="true"]` bekommt 4-px-roten Balken links (`::before`) plus rotes „aktiv"-Pill rechts (`::after`). Der bestehende Glue (Toggle-Open → `state.heizlast.method`) setzt das Attribut. (f) **Mobile (375/390 px)** — neuer `@media (max-width: 640px)`-Block in `HeizlastLayout.astro`: `font-size: 15.5px`, H1 clamp 26–32 px, `.hz-container` padding 16 px symmetrisch, Section-Padding 36 px, Grids 1-spaltig, `.hz-field__input { font-size: 16px; }` gegen iOS-Autozoom, globales `overflow-x: hidden` auf `body` + `.hz-scope`. Zusatz-Breakpoints 520 px in `Section5Auslegung.astro` (Qh-Total 1-spaltig), `Section7Projekt.astro` (Save-Actions gestapelt, volle Button-Breite) und `KpiCard.astro`. (g) **Multi-Button-Actions** — Save-Cloud / Open-Projects / Export / Login-Buttons existieren jetzt in Header **und** Section 7; `heizlast.astro` verwendet `Array.from(querySelectorAll(...))` + Event-Delegation, damit beide Stellen dieselbe Aktion auslösen. Runtime-Injection des Export-Buttons in `.hz-save-actions` entfernt (Button existiert jetzt statisch in Section 7). Tests weiterhin **49 + 16 grün**. Cloudflare-Build ist die finale Abnahme. Acceptance-Liste aus `HANDOFF-PHASE-8.md` (A–G) codeseitig abgearbeitet; manuelle Mobile-Emulation + Live-Test steht beim User.
>
> **Phase 7 abgeschlossen (2026-04-17):** Testing- und Polish-Durchgang. Codeseitig erledigt: (a) **Focus-Trap** in allen drei Modalen — neuer globaler `keydown`-Handler in `heizlast.astro` fängt Tab/Shift+Tab und zyklisiert zwischen erstem und letztem fokussierbaren Element im `.hz-modal__card`, ESC schliesst weiterhin und `lastTrigger.focus()` restauriert den Fokus. (b) **Live-Projektname im Header:** `HeizlastLayout.astro` hat auf `<span class="hz-brand__sub">` jetzt `data-hz-brand-sub`; `renderAll()` schreibt `s.projectName` rein (Fallback „Heizlast-Rechner"). (c) **Save-Status-Animation:** `Section7Projekt.astro` hat neue Klasse `.hz-save-status.is-flash` mit 1.4 s grünem Pulse + Glow; der Store-Subscriber in `heizlast.astro` merkt sich `lastCloudSaveSeen` und triggert die Klasse nur bei echt neuem Cloud-Save (nicht bei Reload). `.hz-save-status` hat zusätzlich `role="status"` + `aria-live="polite"`. (d) **Plausi-Ampel A11y:** `setKpi('plausi', …)` setzt jetzt zusätzlich ein `title`-Attribut („Spezifische Heizleistung — plausibel / grenzwertig / unplausibel"), damit die Ampel nicht nur farblich kommuniziert wird. Neue Helper `ampelLabel()` in `heizlast.astro`. Tests weiterhin 49 + 16 grün. **Manuell abzunehmen (Checklist in `HANDOFF-PHASE-7.md`):** Cloudflare-Build, FWS-Aufgabe 2 (Qhl = 12.55 kW), Login + Projekte-Flow, PDF-/JSON-Export, Mobile-Emulation 375 + 768 px, Tab-Reihenfolge in Modalen, ESC, Focus-Restore. Bei Druck-Qualitätsmangel: Upgrade-Pfad via jsPDF+html2canvas in Phase 8.
>
> **Phase 6 abgeschlossen (2026-04-17):** Login-Modal + Projekt-Liste-Modal + PDF-/JSON-Export live. Vier neue Komponenten in `src/components/heizlast/`: **`LoginModal.astro`** (Passwort-Dialog mit zwei Ansichten `data-hz-login-view="signin|signout"`; POST `/api/heizlast-auth` setzt Cookie, DELETE meldet ab; globale `.hz-modal`-Basis-Styles mit Backdrop `rgba(17,29,51,0.55)`, Body-Scroll-Lock via `body.hz-modal-open`, Card-Animation und generische `.hz-field`/`.hz-btn`-Tokens, die auch `ProjectsModal` und `ExportModal` mitnutzen). **`ProjectsModal.astro`** (wide-Variante max-width 880 px, Toolbar mit Count + Refresh, vier Zustände via `[data-hz-projects-state="loading|empty|error|list"]`, Card-Row-Layout mit Projektname/Status-Badge/Kunde/Adresse/Meta-Zeile EBF/Qhl/Qh/Aktualisierung, Aktionen „Laden" und „Loeschen" mit Confirm; Status-Badge farbcodiert je Status `arbeit|offeriert|bestellt|abgeschlossen|archiv`). **`ExportModal.astro`** (Dateiname-Input; Fieldset „Inhalt" mit 7 Checkboxen `cover/objekt/resultate/diagramm/formeln/grundlagen/notizen`; Fieldset „Format" mit Radios `pdf|json`; Submit „Exportieren"). **`PrintCover.astro`** (Deckblatt für PDF, nur sichtbar wenn `body.hz-print-mode`; Logo + Brand, Kicker „Auslegung", Titel „Waermepumpen-Dimensionierung", Projekt/Kunde/Adresse, vier KPI-Kacheln inkl. `--hero` für Qh, Meta-Grid Typ/Lage/Bauperiode/EBF/tvoll/Status, Footer mit Datum und FWS/SIA-Hinweis; alle Slots via `data-print-slot="…"`). Neues Library-Modul **`src/lib/heizlast/export.ts`** mit `runExport(options)`, `defaultFilename()` und Typ `ExportPart`. PDF-Branch: `fillCoverSlots()` → Chart-Canvas einmalig per `toDataURL('image/png')` in `<img data-print-chart>` gespiegelt → Body-Klassen `hz-print-{part}-on` pro Checkbox → `document.title` sauber → `body.hz-print-mode` an → `window.print()` mit 80 ms delay → Cleanup auf `afterprint`. JSON-Branch: Blob mit `exportedAt/state/results/detail`, Download via `<a download>`. **Print-CSS** in `HeizlastLayout.astro` ergänzt (neuer `@media print`-Block unterhalb der Responsive-Regeln): versteckt Topbar/Exec-Sticky/Footer/Modals/Buttons/Summary/Details im Druckmodus, `@page A4 portrait` mit Margin 18/16/20/16 mm, Seitenzahlen via `@page @bottom-left { content: "Thermowerk" }` + `@bottom-right { content: "Seite " counter(page) " / " counter(pages) }`. Konditionale Sektionen via `body.hz-print-mode:not(.hz-print-{part}-on) #sektion-X { display: none !important; }`. Chart-Canvas `#hz-diag-canvas` im Print versteckt, stattdessen `.hz-diag__print-img`. **`src/pages/heizlast.astro`** erweitert um Imports (`LoginModal/ProjectsModal/ExportModal/PrintCover`, `loadProject/deleteProject/runExport/defaultFilename/ExportPart`, `projectList/projectListLoaded/replaceState`), `<PrintCover />` vor `<ExecutiveSummary />`, drei Modale nach `<Section7Projekt />`, neuer Glue-JS-Block (~300 Zeilen): generische `openModal`/`closeModal`/`closeAllModals` mit `lastTrigger`-Focus-Restore, ESC-Handler, Backdrop-/Dismiss-Click delegiert; Login-Formular-Submit → POST `/api/heizlast-auth` → `uiState.isAuthenticated = true`; Logout → DELETE; `uiState.subscribe` schaltet `body.is-auth` und das Label des Header-Buttons um („Anmelden" / „Abmelden"); Projects-Liste via `setProjectsState`/`renderProjectsList`/`reloadProjects` + Row-Actions (Load/Delete mit Confirm) über Event-Delegation; Export-Form-Submit baut `parts`-Record und ruft `runExport`; Runtime-Injection eines zusätzlichen „Exportieren"-Buttons in `.hz-save-actions` (`[data-hz-action="export"]`). Save-Cloud-Buttons werden aktiv, sobald `probeAuth()` erfolgreich war. Tests weiterhin 49 + 16 grün. **Für Phase 7 (Testing + Deploy) neuer Chat — siehe `HANDOFF-PHASE-7.md`.**
>
> **Phase 10 / Block 3 abgeschlossen (2026-04-18):** Cutover auf v2-Komponenten-Suite vollendet. (a) **`src/pages/heizlast.astro`** komplett neu geschrieben (~700 Zeilen): Imports jetzt aus `../components/heizlast-v2/sections/Section{1Gebaeude,2Heizlast,3Warmwasser,4Zuschlaege,5aDiagramm,5Speicher,6Projekt}.astro` und `../components/heizlast-v2/{LoginModal,ProjectsModal,ExportModal,PrintCover}.astro`. Inline `<header class="topbar">` mit Brand + Projekt-Tag + Login-Trigger. Mount-Order: `PrintCover` → Topbar → Section 1 → 2 → 3 → 4 → 5a (Diagramm) → 5 (Speicher) → 6 (Projekt) → drei Modale. Glue-JS an v2-Selektoren angepasst: Zimmer-Rendering als `.z-table` tbody-Zeilen (7 Spalten via `col-num|col-area|col-chk|col-act`), Sanierung als `.measure-row`, Perioden als `.period .period-{verbrauch|messung|bstd}` mit `BRENNWERTE`-Lookup. Methodenwahl via nativen `<details name="heizlast-method">` Exclusive-Accordion (Listener auf `toggle`-Event, schreibt `methodsEnabled` Record). Gate-/Addon-Sync via `requestAnimationFrame` spiegelt `details.open` in hidden Checkbox + dispatch change. WW-Panes per `data-active="true"` Attribut (matcht Mockup-CSS `.pane[data-active="true"] { display: grid }`). Notes-Dot toggelt `.has-content`-Klasse. Focus-Trap auf `.modal`-Selektor, Login-Form `#f-login-pw`, Export-Form `#f-export-name` + `name="part-*"` + `name="export-fmt"`. `beforeunload`-Warnung erhalten. (b) **`src/layouts/HeizlastLayoutV2.astro` → `src/layouts/HeizlastLayout.astro`** (via `move /y` nach `del` der alten v1-Datei). Print-CSS-Fix auf Zeile 1278: `#sektion-diagramm` → `#sektion-5a` (matcht `Section5aDiagramm.astro anchor="sektion-5a"`). (c) **Legacy-v1-Komponenten gelöscht** — `src/components/heizlast/` komplett entfernt (via `rmdir /s /q`): alle sieben Section-Komponenten, `ExecutiveSummary`, `InfoBox`, `KpiCard`, `Toggle`, `SectionNotes`, `LeistungsDiagramm`, `LoginModal`, `ProjectsModal`, `ExportModal`, `PrintCover`, `OverrideField`, `SectionWrapper`. (d) **Tests** weiterhin grün: 49 Rechenkern + 43 State-Integration (`node --experimental-strip-types scripts/test-heizlast*.ts` auf Windows via Desktop Commander). Kritischer Regressions-Test FWS-Aufgabe 2: Qhl = 12.5453 kW (Referenz 12.55, Tol 0.02) ✓. Cloudflare-Build ist die finale Abnahme. **Damit ist Phase 10 (kompletter v2-Port mit allen drei Blöcken) abgeschlossen.**

## Stack
- **Astro 5.5** – statisches Framework
- **Cloudflare Pages** – Hosting, auto-deploy per GitHub Push (thermowerk-website.pages.dev)
- **Sanity CMS** – vollständig integriert (Project ID: `wpbatz1m`, Dataset: `production`)
  - Studio: https://thermowerk.sanity.studio
  - Sanity Manage: https://www.sanity.io/manage/project/wpbatz1m
  - 16 Singleton-Dokumente im CMS (14 Sektionen + Impressum + Datenschutz)
  - Webhook eingerichtet: Jede Publish-Aktion in Sanity triggert automatisch einen Cloudflare Pages Build

## Dateipfade
Projektordner: `C:\Users\Daniel\Documents\thermowerk-website`

- Komponenten: `src/components/`
- Globales CSS + Layout: `src/layouts/Layout.astro` (ALLES CSS ist hier, keine separaten CSS-Dateien)
- Seitenaufbau + JS: `src/pages/index.astro`
- Impressum: `src/pages/impressum.astro` (eigenständige Seite mit eigenem Header/Topbar/Footer inline, lädt Sanity-Daten via `getPage()`)
- Datenschutz: `src/pages/datenschutz.astro` (gleiche Struktur wie Impressum, lädt Sanity-Daten via `getPage()`)
- Bilder: `public/img/`
- Umgebungsvariablen (nie in Git!): `.env` → enthält `SANITY_API_TOKEN`
- Cloudflare Pages Function: `functions/api/contact.js` (Kontaktformular → Sanity speichern)
- Sanity-Schemas: `sanity/schemas/` (16 Schema-Dateien + `contactSubmission.ts` für Anfragen)
- Sanity-Client + Hilfsfunktionen: `src/lib/sanity.ts` (enthält `getAllSections()`, `getSingleton()`, `getPage()`)
- Sanity Studio Config: `sanity.config.ts`
- Sanity CLI Config: `sanity.cli.ts`
- Seed-Script: `scripts/seed-sanity.mjs` (alle 16 Dokumente)
- Sync-Scripts: `scripts/pull.bat`, `scripts/push.bat`, `scripts/deploy.bat`, `scripts/sync-all.bat`
- Pull-Script (Node): `scripts/pull-sanity.mjs` (exportiert Sanity → `sanity-export.json`)
- Anleitung: `scripts/ANLEITUNG.md`

## Aktive Komponenten (Reihenfolge)
Topbar → Header → Hero → Services → ManufacturerLogos → Wpsm → Steps → About → WhyHeatpump → Klima → Calculator → Region → Contact → Footer

## Sanity CMS – Architektur

### Wie Inhalte geladen werden
1. `src/pages/index.astro` ruft `getAllSections()` aus `src/lib/sanity.ts` auf
2. Das ist ein einzelner GROQ-Query der alle 14 Singleton-Dokumente auf einmal holt
3. Die Daten werden als Props an die jeweiligen Komponenten übergeben:
   - `<Topbar settings={data.settings} />`
   - `<Header nav={data.navigation} />`
   - `<Hero data={data.hero} />`
   - `<Services data={data.services} />`
   - `<ManufacturerLogos data={data.logos} />`
   - `<Wpsm data={data.wpsm} />`
   - `<Steps data={data.steps} />`
   - `<About data={data.about} />`
   - `<WhyHeatpump data={data.why} />`
   - `<Klima data={data.klima} />`
   - `<Calculator data={data.calculator} />`
   - `<Region data={data.region} />`
   - `<Contact data={data.contact} settings={data.settings} />`
   - `<Footer data={data.footer} settings={data.settings} />`

### Fallback-Muster
Jede Komponente hat hardcodierte Fallback-Werte. Wenn Sanity nicht erreichbar ist oder ein Feld leer ist, wird der Original-Wert verwendet:
```astro
const headline = data?.headline || 'Hardcodierter Fallback-Text';
```
Arrays (z.B. Service-Cards, Steps, Facts) haben komplette `defaultXxx`-Arrays als Fallback.

### 16 Sanity-Schemas (`sanity/schemas/`)
| Schema-Datei | Singleton-ID | Verwendet von |
|---|---|---|
| `siteSettings.ts` | `siteSettings` | Topbar, Contact, Footer (globale Daten: Firma, Farben, Fonts, Social URLs) |
| `navigation.ts` | `navigation` | Header (Menüpunkte, CTA-Button, Störung-Button) |
| `heroSection.ts` | `heroSection` | Hero |
| `servicesSection.ts` | `servicesSection` | Services |
| `manufacturerLogos.ts` | `manufacturerLogos` | ManufacturerLogos |
| `wpsmSection.ts` | `wpsmSection` | Wpsm |
| `stepsSection.ts` | `stepsSection` | Steps |
| `aboutSection.ts` | `aboutSection` | About |
| `whySection.ts` | `whySection` | WhyHeatpump |
| `klimaSection.ts` | `klimaSection` | Klima |
| `calculatorSection.ts` | `calculatorSection` | Calculator |
| `regionSection.ts` | `regionSection` | Region |
| `contactSection.ts` | `contactSection` | Contact |
| `footerSection.ts` | `footerSection` | Footer |
| `impressumPage.ts` | `impressumPage` | Impressum (Seite) |
| `datenschutzPage.ts` | `datenschutzPage` | Datenschutz (Seite) |

### Sanity Studio Sidebar-Struktur
Die `sanity.config.ts` definiert eine benutzerdefinierte Sidebar mit allen 16 Schemas als Singleton-Einträge (feste Document-IDs, kein Erstellen/Löschen möglich). Impressum + Datenschutz stehen unter einem separaten Divider nach dem Footer.

### Webhook: Sanity → Cloudflare
- Bei jeder Publish-Aktion (Create/Update) im Dataset `production` wird ein POST an den Cloudflare Deploy Hook gesendet
- Cloudflare baut daraufhin die Seite neu (ca. 1–3 Minuten)
- Webhook-Verwaltung: Sanity Manage → API → Webhooks

### Cloudflare Pages Umgebungsvariablen
Folgende Variablen sind in Cloudflare Pages (Production) gesetzt:
- `SANITY_DATASET` = `production`
- `SANITY_PROJECT_ID` = `wpbatz1m`
- `SANITY_API_TOKEN` = Editor-Token für Sanity-Schreibzugriff (wird von der Contact-Function gebraucht)
- `WEB3FORMS_KEY` = Access Key für E-Mail-Benachrichtigungen (wird aktuell client-seitig genutzt, siehe CRM-Architektur)

## Kontaktformular CRM

### Architektur (Hybrid-Ansatz)
Das Kontaktformular nutzt einen Hybrid-Ansatz wegen einer **Cloudflare-zu-Cloudflare Blockade** (Error 1106): Cloudflare Pages Functions können keine HTTP-Requests an andere Cloudflare-geschützte Domains senden (wie api.web3forms.com).

**Ablauf beim Absenden:**
1. JavaScript in `index.astro` fängt den Form-Submit ab (`e.preventDefault()`)
2. **Parallel** werden zwei Requests gesendet:
   - `fetch('/api/contact')` → Cloudflare Function → speichert in Sanity (server-seitig, braucht Token)
   - `fetch('https://api.web3forms.com/submit')` → direkt vom Browser → sendet E-Mail (umgeht CF-Blockade)
3. Erfolgsmeldung wird angezeigt, Formular ausgeblendet

### Dateien
| Datei | Funktion |
|---|---|
| `functions/api/contact.js` | Cloudflare Pages Function – nimmt JSON-POST entgegen, speichert in Sanity als `contactSubmission` |
| `src/components/Contact.astro` | Formular-HTML mit `id="contactForm"`, Erfolgs-/Fehler-Divs |
| `src/pages/index.astro` | JavaScript für Form-Submit (Sanity + Web3Forms parallel) |
| `sanity/schemas/contactSubmission.ts` | Sanity-Schema für Anfragen mit Status-Tracking (neu/bearbeitung/erledigt) |

### Sanity Studio: Kontaktanfragen
- Letzter Eintrag in der Sidebar: **Kontaktanfragen**
- Kein Singleton – zeigt alle eingegangenen Anfragen als Liste (neueste zuerst)
- Felder: Name, E-Mail, Telefon, Interesse, Nachricht, Eingegangen am, Status (Radio: Neu/In Bearbeitung/Erledigt), Interne Notizen
- Preview zeigt Emoji je nach Status: 🔴 Neu, 🟡 In Bearbeitung, ✅ Erledigt

### Web3Forms Access Key
- Registriert auf `db.coltouan@gmail.com` (private Mail, wird später auf Website-Mail umgestellt)
- Key ist im Client-JS hardcoded (das ist bei Web3Forms so vorgesehen – Keys sind für client-seitige Nutzung gemacht)
- E-Mail geht immer an die bei Web3Forms registrierte Adresse, unabhängig vom `email`-Feld im Formular

### Bekannte Einschränkung
- **Cloudflare Error 1106**: Cloudflare Pages Functions können NICHT an `api.web3forms.com` fetchen (weder JSON noch URL-encoded). Deshalb der Hybrid-Ansatz. Falls Web3Forms ersetzt wird, muss geprüft werden ob der neue Dienst auch hinter Cloudflare liegt.

## Wie Claude Änderungen macht
1. Dateien lesen via **Read-Tool** aus dem gemounteten Pfad `/sessions/.../mnt/thermowerk-website/`
2. Änderungen schreiben via **Edit- oder Write-Tool** direkt in denselben Pfad
3. Committen und pushen via **Desktop Commander** (cmd-Shell):

```
1. Commit-Message schreiben via Desktop Commander write_file:
   write_file("C:\Users\Daniel\Documents\thermowerk-website\commitmsg.txt", "Nachricht hier")

2. Git-Befehle via Desktop Commander start_process (shell: cmd):
   cd /d C:\Users\Daniel\Documents\thermowerk-website && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
```

Claude macht das **selbstständig und vollständig** – kein manueller Schritt nötig.

### Wenn nur CMS-Inhalte geändert werden (kein Code)
→ Direkt in Sanity Studio bearbeiten und publishen. Der Webhook triggert den Rebuild automatisch.

### Wenn Code/Struktur geändert wird
→ Dateien bearbeiten, committen, pushen. Cloudflare baut automatisch.

### Wenn ein neues Sanity-Schema hinzugefügt wird
1. Schema-Datei in `sanity/schemas/` erstellen
2. Schema in `sanity.config.ts` importieren und zur `schema.types`-Liste + Sidebar hinzufügen
3. Query in `src/lib/sanity.ts` → `getAllSections()` erweitern
4. Komponente anpassen um die neuen Props zu akzeptieren
5. `index.astro` anpassen um die neuen Daten als Props zu übergeben
6. Committen + pushen
7. Sanity Studio neu deployen: `npx sanity deploy` (im Projektordner via cmd)

## Sync-Scripts & Workflows

### Verfügbare BAT-Dateien (`scripts/`)
| Script | Funktion |
|---|---|
| `pull.bat` | Exportiert alle Sanity-Daten → `sanity-export.json` (zum Vergleichen/Nachschauen) |
| `push.bat` | Schreibt lokale Werte aus `seed-sanity.mjs` → Sanity (via `createOrReplace`) |
| `deploy.bat` | Git add + commit (fragt nach Message) + push → Cloudflare Rebuild |
| `sync-all.bat` | push.bat + deploy.bat in einem Schritt |

### Workflow: Sanity-Daten nach lokal ziehen
1. `pull.bat` ausführen → erzeugt `sanity-export.json` im Projektordner
2. JSON vergleichen und gewünschte Werte in `seed-sanity.mjs` / Komponenten-Fallbacks übertragen
3. `sync-all.bat` ausführen

### Workflow: Lokale Änderungen nach Sanity + Live
1. Code/Seed-Script bearbeiten
2. `sync-all.bat` ausführen (aktualisiert Sanity + committed + pusht)
3. Cloudflare baut in 1–3 Min automatisch neu

### Workflow: Nur Sanity-Text ändern (kein Code)
1. In Sanity Studio bearbeiten + publishen
2. Webhook triggert Rebuild automatisch – kein Script nötig

### Wie das Seed-Script funktioniert
- `scripts/seed-sanity.mjs` enthält alle 16 Dokumente mit exakten 1:1-Werten aus den Komponenten-Fallbacks
- Verwendet `createOrReplace` mit festen `_id`s – jedes Dokument wird komplett überschrieben
- **Bilder werden bewusst NICHT gesetzt** → Komponenten prüfen auf `image.asset` und fallen auf lokale Dateien aus `public/img/` zurück
- Token wird aus `.env` geladen (via BAT-Datei) oder manuell per `set SANITY_API_TOKEN=... && node scripts/seed-sanity.mjs`
- Token muss **Editor**-Berechtigung haben (Viewer reicht nicht für `createOrReplace`)

### Bild-Fallback-Logik (WICHTIG)
- Komponenten wie `ManufacturerLogos.astro` prüfen: `logo.image && typeof logo.image === 'object' && logo.image.asset`
- Nur wenn ein gültiges Sanity-Bild mit Asset-Referenz existiert, wird es verwendet
- Ohne Bild in Sanity → lokale Fallbacks aus `public/img/` greifen automatisch
- **Bei Problemen**: Bild-Feld in Sanity leeren + publishen → Fallback greift sofort

### Troubleshooting Sync
- **403 bei Seed-Script**: Token hat nur Viewer-Rechte → neuen Editor-Token in Sanity Manage erstellen
- **Werte stimmen nicht überein**: `pull.bat` ausführen, `sanity-export.json` mit `seed-sanity.mjs` vergleichen
- **Bilder fehlen nach Publish**: Komponente prüft `hasValidImages` → wenn Sanity leere Bild-Objekte hat, Feld in Sanity komplett leeren
- **Hero-Position verschoben**: CSS prüfen in `Layout.astro` – Header/Hero nutzen `padding: 0 5vw 0 11vw` (11vw links!)
- **Sonderzeichen in Texten**: Bindestriche (-) vs. Gedankenstriche (–) beachten – per `hexdump` verifizieren wenn nötig

## Wichtige Hinweise
- Git-Pfad: `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`
- Shell für Git-Befehle: immer **cmd** (nicht PowerShell)
- Commit-Message **immer via `write_file`** schreiben (NICHT echo – Zugriff verweigert)
- Commit-Message darf KEIN `1:1` oder ähnliche Sonderzeichen enthalten die Git als Pfad interpretiert – immer `-F commitmsg.txt` verwenden
- `.env` darf nie in Git landen (in .gitignore)
- Sanity-Packages installiert: `sanity`, `@sanity/client`, `@sanity/image-url`, `@sanity/vision`
- Sprache der Website: Deutsch (Schweiz)
- Bei Antworten: knapp halten, keine langen Aufzählungen, nur bei Auswahl oder Fragen ausführlicher

## Cowork-VM — Architektur-Eigenheiten (Root Cause dokumentiert)
> **Warum das wichtig ist:** Seit Phase 7/8 sind zwei wiederkehrende Probleme aufgetaucht, die NICHT durch „falsches Vorgehen" eines Chats entstanden sind, sondern durch fundamentale Eigenheiten der Cowork-VM-Architektur. Hier die Root Cause und die definitiven Workarounds, damit kein Chat mehr rumprobieren muss.

**Architektur:** Der Cowork-Agent läuft in einer Linux-VM und mountet den Windows-Projektordner via **virtiofs/FUSE** (`/sessions/<id>/mnt/thermowerk-website`). Das Edit/Write-Tool schreibt direkt auf die Windows-Seite (`C:\Users\Daniel\Documents\thermowerk-website`). Bash-Tool (`mcp__workspace__bash`) arbeitet auf dem Linux-Mount.

### Problem 1 — „Mount-Drift": Edits landen nicht im Linux-Mount-Cache
**Symptom:** Edit/Write-Tool meldet Success, aber `git status` auf dem Linux-Mount zeigt die Datei nicht als modifiziert; `git diff HEAD -- <file>` ist leer, obwohl der Inhalt offensichtlich neu ist.
**Ursache:** FUSE cached `stat()`-Ergebnisse; die Windows-Schreiboperation invalidiert den Cache nicht immer zuverlässig. Git liest die alte mtime und glaubt, die Datei sei unverändert.
**Fix:** `git update-index --refresh` (auf Linux) zwingt Git, alle Dateien neu zu stat-en. Danach taucht die Änderung in `git status` auf. Als Faustregel: nach jedem grösseren Edit/Write einmal `git update-index --refresh` laufen lassen.

### Problem 2 — „virtiofs unlink-Block": Linux kann nicht in .git löschen
**Symptom:** `rm -f .git/index.lock` im Linux-Mount scheitert mit `Operation not permitted`, obwohl `.git` mit `0700`-Rechten dem Linux-User gehört und `create` erlaubt ist.
**Ursache:** virtiofs/FUSE mit `default_permissions` erlaubt in `.git` teils `create`/`write`, aber blockt `unlink` (vermutlich weil Windows die Datei offen hält oder die Rechte-Übersetzung asymmetrisch ist).
**Konsequenz:** Git-Operationen (`git add`, `git commit`) MÜSSEN immer über Desktop Commander auf der Windows-Seite laufen — NIE im Linux-Bash.

### Problem 3 — „index.lock hängt": cmd-`del` schlägt still fehl
**Symptom:** `.git\index.lock` bleibt nach einem abgebrochenen Git-Prozess liegen; `del /f /q .git\index.lock` in cmd meldet Erfolg, aber der Lock ist beim nächsten Befehl wieder da (oder wurde nie gelöscht).
**Ursache:** Offenes Handle (VS Code Git-Extension, Watcher, oder crashed git.exe) hält den Lock. `del` in cmd verwendet Shell-Builtins mit eingeschränkter Semantik.
**Fix:** PowerShell `Remove-Item -Force` nutzt die vollen Win32-API-Calls und kann solche Locks brechen:
```powershell
Remove-Item -Path "C:\Users\Daniel\Documents\thermowerk-website\.git\index.lock" -Force -ErrorAction SilentlyContinue
```
**Wichtig:** NUR `Remove-Item` in PowerShell laufen lassen. Git-Befehle danach zurück in cmd — PowerShell-Pipelines mit `& git.exe` werfen `CantActivateDocumentInPipeline`-Fehler.

### Standard-Workflow für Commits (nach diesen Erkenntnissen)
1. Edits via Edit/Write-Tool machen (landet auf Windows-Seite).
2. `git update-index --refresh` im Linux-Bash (räumt Stale-Cache auf, macht die Änderungen für `git status` sichtbar — nur als Verifikations-Schritt, wenn man prüfen will, was sich geändert hat).
3. `commitmsg.txt` via `write_file` erstellen.
4. PowerShell-Fallback nur wenn `.git\index.lock` hängt:
   ```
   Remove-Item "C:\Users\Daniel\Documents\thermowerk-website\.git\index.lock" -Force -ErrorAction SilentlyContinue
   ```
5. In cmd via Desktop Commander:
   ```
   cd /d C:\Users\Daniel\Documents\thermowerk-website && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
   ```

### Problem 4 — „Heredoc escaped `!` als `\!`"
**Symptom:** Python-Patches, die via `python3 << 'PY'` ... `PY` ausgeführt werden und ein `!` in Strings enthalten, bekommen nach Execution `\!` im Output.
**Ursache:** Bash Histexpansion greift trotz Single-Quoted Heredoc manchmal.
**Fix:** Entweder `!` vermeiden oder hinterher `sed -i 's|\\!|!|g' <file>` laufen lassen.

### Problem 5 — „Controlled Folder Access blockiert Löschen im Repo"
**Symptom:** `del /f /q <file>` im Desktop-Commander-cmd-Aufruf scheitert still (kein Error-Code, aber die Datei bleibt); Windows-Meldung: „Zugriff auf geschützten Ordner blockiert — Blockierte APP: cmd.exe".
**Ursache:** Der Ordner `C:\Users\Daniel\Documents\thermowerk-website` liegt unter Ransomware-Schutz (Controlled Folder Access). `cmd.exe` ist standardmässig nicht auf der Whitelist — `git.exe` und `node.exe` sind, weshalb `git add`/`commit`/`push` durchlaufen, aber das `del` davor scheitert.
**Fix (einmalig, ist gemacht):** In Windows-Sicherheit → Ransomware-Schutz → Zulässige Apps: `C:\Windows\System32\cmd.exe` über „Zuletzt blockierte Apps" freigeben. Danach lief der Probe-Commit-Cycle (create → commit → delete → commit) sauber durch.
**Dauerhafte Konsequenz:** Im Standard-Commit-Flow darf `del` genutzt werden. Falls auf einer anderen Maschine (ohne cmd-Whitelist) gearbeitet wird: auf `powershell -Command "Remove-Item -Force <file>"` ausweichen — powershell.exe ist in der Regel bereits zugelassen.

## Windows-Setup (einmalig gemacht, 2026-04-17)
> **WICHTIG:** Dieses Setup ist auf Daniels Laptop bereits aktiv. Nicht nochmal durchlaufen. Nur als Referenz für Re-Install oder Zweitrechner.

**Windows Defender — Ausschlüsse (Viren- & Bedrohungsschutz → Einstellungen verwalten → Ausschlüsse):**
- Ordner: `C:\Users\Daniel\Documents\thermowerk-website`
- Ordner: `C:\Users\Daniel\AppData\Local\Packages\Claude_pzs8sxrjxfjjc` (MSIX-Container von Cowork)
- Ordner: `C:\Users\Daniel\AppData\Roaming\Claude` (virtuelle App-Sicht, Cowork schreibt hier intern)
- Ordner: `C:\Users\Daniel\AppData\Local\Programs\Git`
- Ordner: `C:\Program Files\nodejs`
- Prozess: `git.exe`
- Prozess: `node.exe`

**Controlled Folder Access — Zulässige Apps (Ransomware-Schutz → Zulässige Apps):**
- `node.exe` (`C:\Program Files\nodejs`)
- `git.exe` (via Cowork-Package-Pfad)
- `claude.exe` (via WinGet)
- `powershell.exe` (`C:\Windows\System32\WindowsPowerShell\v1.0`)
- `cmd.exe` (`C:\Windows\System32\cmd.exe`)

**PowerShell Execution Policy (einmalig in Admin-PS):**
```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
```

**Long-Path-Support (einmalig in Admin-PS):**
```
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```
Neustart danach erforderlich.

**Cowork als Administrator:** Bei MSIX-Apps (Store-Installation) **nicht möglich** — der Haken „Als Administrator ausführen" ist in den Verknüpfungs-Eigenschaften grau. Ein Start als Admin via Taskleiste startet Cowork in einem separaten Admin-User-Kontext ohne Zugriff auf Daniels Projekte. Daher: Cowork bleibt im normalen User-Kontext.

**Architektur-Hinweis zu MSIX-Cowork:** Cowork liegt unter `C:\Program Files\WindowsApps\Claude_…\app\Claude.exe` und speichert User-Daten physisch in `C:\Users\Daniel\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude`. Der Pfad `C:\Users\Daniel\AppData\Roaming\Claude`, den Cowork intern sieht, ist eine virtuelle App-Sicht und aus dem normalen User-PowerShell heraus nicht auflösbar (`Test-Path` → False). Das ist Windows-Sandbox-Normalverhalten, kein Fehler.

**Verifizierter Commit-Workflow (nicht anders probieren):**
1. Edits via Edit/Write-Tool (Windows-seitig)
2. `commitmsg.txt` via Desktop Commander `write_file`
3. In cmd via Desktop Commander `start_process` (shell: `cmd`):
   ```
   cd /d C:\Users\Daniel\Documents\thermowerk-website && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
   ```
4. Falls `.git\index.lock` hängt: einmalig Admin-PowerShell `Remove-Item -Path "C:\Users\Daniel\Documents\thermowerk-website\.git\index.lock" -Force -ErrorAction SilentlyContinue`, dann Schritt 3 retry.
5. Falls FUSE-Cache stale (nur zu Diagnose-Zwecken nötig): im Linux-Bash `git update-index --refresh`.

Dieser Flow ist mit zwei vollständigen Create→Commit→Delete→Commit-Zyklen am 2026-04-17 verifiziert. Kein anderer Weg ist erlaubt (z.B. kein `git add` via Linux-Bash, kein `del` via PowerShell, kein MSIX-Admin-Start).

## Bekannte Fallstricke (WICHTIG)
- **fade-up Animation überschreibt transform**: Alle Hero-Elemente haben die Klasse `fade-up`. Die Regel `.fade-up.visible { transform: translateY(0) }` überschreibt jedes custom `transform` auf Hero-Elementen. Lösung: Spezifischeren Selektor verwenden, z.B. `.hero h1.fade-up.visible { transform: translateY(-9vh); }`. Das gilt auch für Mobile-Breakpoints!
- **Topbar-Alignment per JS**: Die Topbar-Kontaktinfos werden per JavaScript an der Nav-Position ausgerichtet. Das Script in `index.astro` liest `nav.getBoundingClientRect().left` und setzt `--nav-left` als CSS-Variable. Ebenso wird `--cta-btn-width` für die Social-Icons gemessen. Beide müssen NACH Font-Load gemessen werden (`document.fonts.ready.then()`), sonst stimmen die Werte nicht.
- **Google Fonts Timing**: Fonts (Outfit, DM Sans, Montserrat) werden von Google Fonts geladen. Layout-Messungen erst nach `document.fonts.ready` oder `window load` machen.
- **Responsive Breakpoints**: 968px (Tablet – Topbar verschwindet, Burger-Menü), 640px (Mobile – Hero-Layout ändert sich komplett). Mobile hat eigene Hero-Styles die Desktop-Werte überschreiben müssen.
- **Impressum/Datenschutz haben eigenen Header inline**: Beide Seiten (`impressum.astro`, `datenschutz.astro`) haben eine eigene Kopie des Headers eingebettet (nicht die Header-Komponente). Bei Änderungen am Header müssen alle 3 Dateien angepasst werden (Header.astro + impressum.astro + datenschutz.astro)! Topbar und Footer werden als Komponenten importiert.
- **Astro Scoped Styles erreichen keine Child-Komponenten**: Für komponentenübergreifende Styles `<style is:global>` verwenden (z.B. Footer z-index auf Impressum-Seite).
- **Sanity Portable Text**: Wird in einigen Feldern (About intro/closing, Wpsm bodyText) als Block-Array gespeichert. Text extrahieren via `block.children.map(span => span.text).join('')`.
- **SVG-Icons aus Sanity**: Werden als String im Feld `iconSvg` gespeichert und via `set:html` Direktive gerendert: `<div set:html={fact.iconSvg}></div>`.
- **Bilder aus Sanity**: Über `urlFor(image).width(x).url()` aus `src/lib/sanity.ts` laden.
- **Cloudflare Error 1106**: Cloudflare Pages Functions können keine Requests an andere CF-geschützte Domains senden. Web3Forms wird deshalb client-seitig aufgerufen. Bei neuen externen API-Calls aus Functions immer prüfen ob die Ziel-Domain hinter Cloudflare liegt!

## Heizlast-Rechner — Status

### Phase 1: Rechenkern (abgeschlossen 2026-04-16)
- **Quelle:** `reference/old-calculator/js/heizlast.js` + `js/constants.js`
- **Ziel:** `src/lib/heizlast/types.ts`, `constants.ts`, `calculations.ts` (TypeScript strict)
- **Tests:** `scripts/test-heizlast.ts` — 49 Assertions, alle grün
  - FWS-Aufgaben 1A, 1B, 2, 3, 4 (Regression, Referenzwerte aus FWS-Lösung)
  - Eigenes Beispiel „Referenzhaus Moosseedorf" (Vorwärtsrechnung, Hand-nachrechenbar)
  - Rückrechnung aus den Ergebnissen zurück zu den Eingaben (Invertierbarkeits-Check)
- **Doku:** `reference/BEISPIELRECHNUNG.md` — Schritt-für-Schritt-Protokoll des eigenen Beispiels
- **Kritischer Regressions-Wert:** FWS-Aufgabe 2 → Qhl = 12.55 kW (Toleranz 0.02)
- **Testlauf:** `node --experimental-strip-types scripts/test-heizlast.ts` (Node 22.6+)
- **tsconfig.json** ergänzt um `allowImportingTsExtensions: true` + `noEmit: true` (damit `.ts`-Extensions in Imports auch von Astro akzeptiert werden).

### Phase 2: UI-Grundlagen (abgeschlossen 2026-04-16)
- **Layout:** `src/layouts/HeizlastLayout.astro` — eigener Scope `.hz-scope` mit `--hz-*`-Token-Set, schlanker Header (Logo + Login-Trigger), minimaler Footer, keine Site-Navigation. Nutzt denselben Farb- und Font-Kanon wie das Marketing-Layout, aber isoliert vom globalen CSS.
- **Primitives unter `src/components/heizlast/`:**
  - `SectionWrapper.astro` — Standard-Sektion mit Kicker (rot caps), Titel, Subline, optionalem `slot="aside"` für Live-KPIs und abwechselndem Hintergrund (`tone="white"|"off"`).
  - `InfoBox.astro` — Aufklappbare `<details>`-Box in Blue-tint (#E8EDF5), Icon-Varianten `info`/`book`/`help`, optionaler Subtitle, `.hz-info__grid` für Abkürzungslisten, zugänglich ohne JS.
  - `KpiCard.astro` — Zwei Varianten: `default` (Off-White-Block, 28-px-Zahl, Label rot caps) und `hero` (weisser Block mit rot oben, grosse Zahl, Shadow, für Executive Summary). Optional: `delta` + `deltaTone`, `caption`, Link-Version via `href`. Utility-Klassen `.hz-kpi-grid` und `.hz-kpi-grid--hero` für Kachel-Reihen.
  - `OverrideField.astro` — Input mit sichtbarem Default, Stift-Icon rechts. Klick → Feld editierbar (`.is-overridden`), Icon wird zu Reset-Pfeil, Default wird beim Zurücksetzen wiederhergestellt. Click-Handler ist delegiert und bindet sich nur einmal (`window.__hzOvrBound`). Wrapper trägt `data-default` für Rücksetzung.
  - `Toggle.astro` — Pill-Chip mit Plus/Minus-Kreis; öffnet darunter einen Inhalt mit linker Navy-Akzentleiste. `aria-expanded` + `aria-controls` korrekt gesetzt, Inhalt initial `hidden`. Delegierter Click-Handler (`window.__hzToggleBound`).
- **Sandbox:** `src/pages/heizlast-sandbox.astro` — interne Vorschau-Seite, die alle Primitives in realistischen Kombinationen zeigt. Wird in Phase 4 entfernt.
- **Design-Prinzipien:** Navy/Rot werden als Akzentfarben verwendet, nicht als grossflächige Hintergründe (User-Wunsch). Hero-KPIs haben eine 3px rote Oberkante statt kompletten Navy-Fonds.
- **Bekannt:** `npx astro check` läuft in der Linux-Sandbox nicht (rollup-native für Windows installiert). Auf Cloudflare funktioniert der Build. TypeScript-Check für die neuen Komponenten ist fehlerfrei.

### Phase 3: State + Storage (abgeschlossen 2026-04-17)
- **Dependency:** `nanostores@^1.2`, `@nanostores/persistent@^1.3` (letzteres aktuell ungenutzt — Reserve für spätere Präferenzen).
- **`src/lib/heizlast/state.ts`** — zentraler `map`-Store `heizlastState` mit typisiertem `HeizlastState`-Interface (Projekt-Metadata, `gebaeude`, `heizlast`, `warmwasser`, `zuschlaege`, `speicher`). `createDefaultState()` liefert ein FWS-Aufgabe-2-nahes Startset. Setter: `updateSection(key, patch)` für Sub-Objekte, `setField` für Top-Level, `replaceState` für Ladeoperationen, `resetState` für neues Projekt. Nebenstores: `uiState` (Modal-/Sync-/Auth-Flags, nicht persistiert), `projectList` + `projectListLoaded`, `isDirty`, `tvollEffektiv` (computed). State-Version `STATE_VERSION = 1` — bei Breaking Change hochzählen und Migration in `storage.ts` ergänzen.
- **`src/lib/heizlast/storage.ts`** — LocalStorage-Key `thermowerk.heizlast.state.v1`. `bootFromStorage()` lädt beim Seitenstart, `subscribeAutoSave()` abonniert den Store und persistiert debounced (500 ms). `serializeState` + `deserializeState` sind pur und von Node-Tests nutzbar. `LEGACY_KEYS` werden beim Boot stumm entfernt (neuer Key, kein Migration aus altem Rechner). `hardReset()` für "Neues Projekt"-Knopf.
- **`src/lib/heizlast/projects.ts`** — Wrapper für `/api/heizlast-projects` (bestehende Cloudflare Function). Exports: `listProjects()`, `loadProject(id)`, `saveProject({asNew?, computed?})`, `deleteProject(id)`, `probeAuth()`. Alle Requests `credentials: 'same-origin'`, Cookies vom Auth-Endpoint gehen automatisch mit. Schreibt `uiState.syncInFlight`/`.lastError`/`.lastCloudSave` für UI-Feedback. Aktualisiert `projectList` optimistisch nach save/delete.
- **`src/lib/heizlast/compute.ts`** — `runCascade(state)` läuft die Reihenfolge M1 (Stammdaten/tvoll) → M2 (Methode: Verbrauch/Messung/Bstd/Bauperiode/Override) → M4 (Sanierungs-Delta) → M3 (Plausibilität W/m²) → M5 (WW: personen/direkt/messung → vwu → qwu → qwwTag → qw) → M6 (Qoff, optional Qas) → M7 (Qh = Qhl + Qw + Qoff + Qas) → M8 (WW-Speicher) → M9 (Puffer: abtau/takt/err/sperrzeit). Jede Stufe darf mit `null` scheitern — Folgestufen rechnen weiter soweit Daten verfügbar. Derived Store `heizlastCompute` triggert automatisch bei jeder State-Änderung. **Wichtig:** WW-Abzug bei Verbrauchsmethode nutzt `qnwwJahr()` inkl. Verlust-Faktoren (speicher/zirk/ausstoss aus State) — sonst stimmen FWS-Werte nicht!
- **Integrations-Tests:** `scripts/test-heizlast-state.ts` — 16 Assertions. Kritisch: FWS-Aufgabe 2 via State + Cascade → **Qhl = 12.55 kW** (tol 0.05). Serialisierung round-trip, Versionsmigration (v999 → null), SSR-Safety (`saveNow`/`load`/`clear` ohne `window` nicht-crashend), WW-Speicher-Rundung % 10 = 0. Testlauf: `node --experimental-strip-types scripts/test-heizlast-state.ts`.
- **Sandbox-Demo:** `/heizlast-sandbox` hat neue Sektion "07 / Phase 3 — State live". Input `Ba` (Oel-Verbrauch) ist an `heizlastState.heizlast.verbrauch.ba` gebunden; vier KPI-Kacheln (Qhl / W/m² / Qh / WW-Speicher) rendern live aus `heizlastCompute`. localStorage-Save ist aktiv — Reload erhält den letzten Wert.

### Phase 4: Komplette UI (abgeschlossen 2026-04-17)
- **Bindings:** `src/lib/heizlast/bindings.ts` — deklaratives Two-Way-Binding. `data-hz-bind="gebaeude.ebf"` + `data-hz-type="number"` (optional, sonst aus `input.type` abgeleitet). `bootBindings(root=document)` bindet sich per Event-Delegation an `input`/`change`, `setPath` erzeugt ein neues Top-Level-Objekt (Nano Stores erkennt so die Änderung). Store→DOM via `heizlastState.subscribe`. Idempotent per `window.__hzBindingsBound`.
- **State-Erweiterungen in `state.ts`:**
  - `RaumInput = { id, name, laenge, breite, flaecheOverride }` + `gebaeude.raeume: RaumInput[]` + `gebaeude.raeumeAktiv: boolean` (Live-Modus-Flag).
  - `SectionNote = { text, includeInExport }` + `NotizenState.sektion1..sektion7`.
  - Helpers am Dateiende (NICHT zwischen `createDefaultState` und den Stores — sonst ts-parser-Fehler): `setNoteText`, `setNoteExport`, `addRaum`, `removeRaum`, `updateRaum`, `sumRaumFlaechen`.
- **Sektionen:** `src/components/heizlast/sections/Section{1..7}*.astro`. Alle Inputs verwenden `data-hz-bind`. Gemeinsame Patterns:
  - Section 1: Navy-Projekt-Block oben (`.hz-proj`) + Stammdaten + Toggle „EBF aus Zimmermassen" (Zimmerliste `#hz-raum-list`, Live-Checkbox, Übernehmen-Button).
  - Section 2: fünf Methoden-Toggles (Verbrauch/Messung/Bstd/Bauperiode/Override) jeweils mit `.hz-method[data-method="..."]` innen. Der Glue in `heizlast.astro` markiert den aktiven Toggle mit `data-active="true"` (→ roter Akzent via CSS) und zeigt Badge „aktiv". Optional M4 (Sanierungs-Liste über Dropdown `#hz-san-select` → `#hz-san-list`) und M3 (Plausi-Checkbox).
  - Section 3: Main-Switch `warmwasser.active` + Radio `warmwasser.method` (personen/direkt/messung) + drei Panes (`[data-ww-pane]`), Personen-Einheiten `#hz-pe-list`, Verluste-Grid.
  - Section 4: `zuschlaege.toff` + optionaler Qas-Toggle.
  - Section 5: Vier KpiCards `[data-kpi="qhlKorr|qw|qoff|qas"]` als Summanden + grosser Qh-Block `.hz-qh-total`.
  - Section 6: Zwei Karten (WW | Puffer) mit je eigenem Active-Switch.
  - Section 7: `<dl>` mit `[data-hz-sum]`-Slots + Save-Buttons `[data-hz-action="save-cloud|save-cloud-new|open-projects|login|new-project"]` + Status-Pill `[data-hz-save-status][data-tone="ok|busy|err"]`.
- **`SectionNotes.astro`:** Ghost-Toggle mit Notizblock-Icon, Badge „ausgefüllt" erscheint wenn Text vorhanden. Piggybackt auf `Toggle.astro`-Delegated-Handler via `data-action="toggle-module"`.
- **Hauptseite `src/pages/heizlast.astro`:** Long-Scroll Section 1–7 + Glue-JS. Boot-Reihenfolge: `bootFromStorage() → subscribeAutoSave() → bootBindings() → syncDomFromState()`. Dynamische Listen werden per Event-Delegation (document-level) gerendert. Compute-Subscriber (`heizlastCompute.subscribe`) + State-Subscriber (`heizlastState.subscribe`) rufen `renderAll()` auf — schreibt in `[data-kpi]` die Live-Werte und in `[data-hz-sum]` die Zusammenfassung; setzt Plausi-Ampel `data-ampel="gruen|gelb|rot"`. M2-Methodenwahl: Klick auf `[data-action="toggle-module"]` → setTimeout(0) → wenn `.is-open`, setze `state.heizlast.method`. WW-Panes: `[data-ww-pane]` bekommt `.is-active` passend zu `state.warmwasser.method`.
- **Sandbox gelöscht:** `src/pages/heizlast-sandbox.astro` entfernt (für die Zukunft: nur noch `/heizlast` als einziges Test-UI).
- **Tests:** Rechenkern 49 + State-Integration 16 weiterhin grün (`node --experimental-strip-types scripts/test-heizlast*.ts`).
- **Bekannte Limitierungen:** Auth-Modal, Projekt-Liste-Modal, Chart.js-Diagramm, PDF-Export folgen in Phase 5/6. Save-Cloud-Buttons sind `disabled`, bis `probeAuth()` Auth bestätigt.

### Phase 5: Executive Summary + Leistungsdiagramm (abgeschlossen 2026-04-17)
- **Dependency:** `chart.js@^4` (via `npm install chart.js`).
- **`src/components/heizlast/ExecutiveSummary.astro`** — sticky Stat-Row unterhalb des Layout-Headers. Eigener Scope `.hz-exec` mit `position: sticky; top: var(--hz-header-height); z-index: 30`. Fünf Felder: `qh` (Hero-Variante, rote Oberkante, grössere Zahl), `qhlKorr`, `plausi` (mit zusätzlichem `.hz-exec__ampel`-Dot, gesteuert via `data-ampel="gruen|gelb|rot"` auf dem Stat-Wrapper), `wwSpeicher`, `puffer`. Jedes Feld trägt `[data-kpi="…"]` — die bestehende `setKpi()`-Logik in `heizlast.astro` befüllt sie automatisch (kein Umbau nötig). Responsive Breakpoints 900 px (wrap auf 3 Spalten) und 560 px (2 Spalten).
- **`src/components/heizlast/LeistungsDiagramm.astro`** — eigene Sektion `id="sektion-diagramm"` / kicker „05a - Leistungsdiagramm", zwischen Section5Auslegung und Section6Speicher. Chart.js-Liniendiagramm mit vier Datasets:
  - **Gebaeude-Heizkennlinie** (rot, 2.5 px): linear von `(θne, Qhl)` bis `(θGT, 0)`, Qhl aus `heizlastCompute.qhlKorr`.
  - **WP-Kennlinie** (navy, tension 0.25, Punkte): fünf Stützpunkte bei −15/−7/2/7/12 °C (A-Wert), Leistung in kW bei W35. Drei Presets: `klein` (6 kW-Klasse), `mittel` (9 kW), `gross` (12 kW), plus Option „Eigene Werte" (alle Stützpunkte frei editierbar).
  - **Auslegungspunkt**: einzelner roter Marker bei `(θne, Qh)`.
  - **Bivalenzpunkt**: grüner Kreis am Schnittpunkt — berechnet per Bisektion auf `f(θ) = gebaeude(θ) − wpInterpoliert(θ)` über dem Intervall `[θne, θGT]` (maximal 40 Iterationen, Abbruch bei `|f| < 1e-4`).
- Controls: Dropdown Modell, Inputs für θGT und θne, Reset-Button.
- Stützpunkte werden in einem `<details>`-Accordion als Tabelle gerendert; manuelle Eingabe schaltet Dropdown automatisch auf „Eigene Werte".
- Datenfluss: `heizlastCompute.subscribe()` + `heizlastState.subscribe()` → `updateChart()`; Modell-State (Stützpunkte, aktueller Model-Key) lebt im Script-Scope der Komponente (nicht im nanostore, da rein Diagramm-lokal).
- Meta-Zeile unter dem Canvas (`#hz-diag-meta`) zeigt Qhl, Qh und Bivalenzpunkt textuell — hilft bei Screenreadern und wenn das Canvas nicht rendert.
- InfoBox erklärt Bivalenzpunkt, Leseanleitung rot/blau/Schnittpunkt.
- **`src/pages/heizlast.astro`** bindet die zwei neuen Komponenten ein (`ExecutiveSummary` vor Section1, `LeistungsDiagramm` nach Section5). Kein Umbau von `renderAll()`, keine neuen State-Felder.
- **Tests:** Phase-1-Rechenkern 49 / Phase-3-State 16 weiterhin grün. Astro-Check lokal nicht möglich (Sandbox-Rollup-Issue), Cloudflare-Build ist die Abnahme.

### Phase 6: Login + Projekte + Export (abgeschlossen 2026-04-17)
- **Vier neue Komponenten** in `src/components/heizlast/`:
  - `LoginModal.astro` — Passwort-Dialog mit zwei Ansichten (`data-hz-login-view="signin|signout"`). Enthaelt die globalen `.hz-modal`-Basis-Styles (Backdrop `rgba(17,29,51,0.55)`, Card-Animation, `.hz-field`/`.hz-btn`-Tokens, `body.hz-modal-open { overflow: hidden }` als Scroll-Lock). Wird von den beiden anderen Modalen mitgenutzt.
  - `ProjectsModal.astro` — wide (max-width 880 px), Toolbar mit `#hz-projects-count` + `#hz-projects-refresh`, vier Zustaende via `[data-hz-projects-state="loading|empty|error|list"]`. Card-Row-Layout mit Projektname + farbcodierter Status-Badge (`arbeit|offeriert|bestellt|abgeschlossen|archiv`), Kunde/Adresse, Meta-Zeile EBF/Qhl/Qh/Aktualisierung, Aktionen „Laden" + „Loeschen" (Confirm).
  - `ExportModal.astro` — Dateiname-Input + Fieldset „Inhalt" (7 Checkboxen `cover/objekt/resultate/diagramm/formeln/grundlagen/notizen`) + Fieldset „Format" (Radios `pdf|json`) + Submit.
  - `PrintCover.astro` — Deckblatt fuer PDF, nur sichtbar wenn `body.hz-print-mode`. Logo + Brand, Kicker „Auslegung", Titel „Waermepumpen-Dimensionierung", Projekt/Kunde/Adresse, vier KPI-Kacheln (eine als `--hero` fuer Qh), Meta-Grid, Footer mit Datum + FWS/SIA-Hinweis. Alle Werte werden per `data-print-slot="…"` gefuellt.
- **Neues Library-Modul:** `src/lib/heizlast/export.ts` — exportiert `runExport(options)`, `defaultFilename()` und Typ `ExportPart`. PDF-Branch: `fillCoverSlots()` schreibt alle Deckblatt-Slots aus `state` + `compute`; `replaceChartWithImage()` spiegelt den Chart-Canvas per `toDataURL('image/png')` in ein `<img data-print-chart>` (Cleanup auf `afterprint`); Body-Klassen `hz-print-{part}-on` werden pro Checkbox an/aus geschaltet; `document.title` wird auf den sanitisierten Dateinamen gesetzt; 80 ms spaeter ruft er `window.print()`. JSON-Branch: baut `{ exportedAt, state, results, detail }` und triggert Download via `<a download>` + Blob.
- **Print-CSS** in `HeizlastLayout.astro` ergaenzt (neuer `@media print`-Block hinter den Responsive-Regeln):
  - Versteckt: Topbar, Exec-Sticky, Footer, Modale, Buttons, `<summary>`, `<details>`-Pfeile.
  - `@page { size: A4 portrait; margin: 18mm 16mm 20mm 16mm; }` mit Seitenzahlen (`@page @bottom-left { content: "Thermowerk" }` + `@bottom-right { content: "Seite " counter(page) " / " counter(pages) }`).
  - Konditionale Sektionen: `body.hz-print-mode:not(.hz-print-{part}-on) #sektion-X { display: none !important; }` — exakt die Checkboxen im ExportModal steuern was gedruckt wird.
  - Chart-Canvas `#hz-diag-canvas` wird im Print versteckt, stattdessen `.hz-diag__print-img` gezeigt (der `toDataURL`-Screenshot).
- **Glue in `src/pages/heizlast.astro`:** neue Imports (`LoginModal`, `ProjectsModal`, `ExportModal`, `PrintCover`, `loadProject`, `deleteProject`, `runExport`, `defaultFilename`, `ExportPart`, `projectList`, `projectListLoaded`, `replaceState`), `<PrintCover />` vor `<ExecutiveSummary />`, drei Modale nach `<Section7Projekt />`. Im Script:
  - Generische `openModal`/`closeModal`/`closeAllModals` mit `lastTrigger`-Focus-Restore, ESC-Key-Handler, Backdrop- und `[data-hz-modal-dismiss]`-Delegation.
  - Login-Submit → POST `/api/heizlast-auth` (Cookie-basiert) → `uiState.isAuthenticated = true` + `probeAuth()` → `projectList` refreshen.
  - Logout → DELETE `/api/heizlast-auth` → `uiState.isAuthenticated = false` + `projectList` leeren.
  - `uiState.subscribe` toggelt `body.is-auth` und das Label des Header-Logins („Anmelden" / „Abmelden"). Save-Cloud-Buttons werden erst aktiv wenn `isAuthenticated === true`.
  - Projects-Liste: `setProjectsState(loading|empty|error|list)`, `renderProjectsList(items)` mit sauberem HTML-Escape, Row-Actions (Load/Delete) per Event-Delegation im Modal-Scope.
  - Export-Form-Submit liest Checkboxen in ein `Record<ExportPart, boolean>` + Format aus Radio, ruft `runExport`.
  - Runtime-Injection eines zusaetzlichen „Exportieren"-Buttons in `.hz-save-actions` (`[data-hz-action="export"]`), oeffnet `ExportModal` mit vorbelegtem `defaultFilename()`.
- **Tests:** Rechenkern 49 + State-Integration 16 weiterhin gruen (`node --experimental-strip-types scripts/test-heizlast*.ts`). Astro-Check lokal nicht moeglich (Rollup-Sandbox-Issue), Cloudflare-Build ist die Abnahme.
- **Bekannte Limitierungen:**
  - Print-Qualitaet haengt vom Browser-Drucker ab (Keynote-Niveau nur mit Chrome/Edge „Als PDF speichern"). Upgrade auf `jsPDF` + `html2canvas` bleibt fuer Phase 7 offen, falls die Print-CSS-Variante nicht reicht.
  - Aktiver Projekteintrag wird noch nicht visuell im ProjectsModal gehighlightet (Nice-to-have fuer Phase 7).

### Phase 7: Testing + Polish (abgeschlossen 2026-04-17)
Code-Polish vor der finalen manuellen Abnahme:
- **Focus-Trap in Modalen** (`src/pages/heizlast.astro`) — neuer globaler `keydown`-Handler fängt `Tab`/`Shift+Tab`, sammelt alle sichtbaren fokussierbaren Elemente innerhalb von `.hz-modal__card` und zyklisiert zwischen erstem und letztem. Funktioniert parallel zum bestehenden ESC-Handler und `lastTrigger`-Focus-Restore.
- **Live-Projektname im Header** — `src/layouts/HeizlastLayout.astro` hat `<span class="hz-brand__sub" data-hz-brand-sub>`. `renderAll()` schreibt `state.projectName` rein; bei leerem Namen fällt er auf „Heizlast-Rechner" zurück. Auf Mobile (`<640 px`) bleibt das Element via `display: none` unsichtbar.
- **Save-Status-Animation** — `.hz-save-status.is-flash` in `Section7Projekt.astro` (1.4 s grüner Glow/Pulse via `@keyframes hz-save-flash`). `heizlast.astro` merkt sich `lastCloudSaveSeen` im `uiState.subscribe` und triggert die Klasse nur bei echt neuem `lastCloudSave` (verhindert Flash beim Reload). Nach 1500 ms wird die Klasse wieder entfernt. `.hz-save-status` hat zusätzlich `role="status"` + `aria-live="polite"` für Screenreader.
- **Plausi-Ampel A11y** — `setKpi('plausi', …)` setzt jetzt ein `title`-Attribut auf der Stat-Kachel („Spezifische Heizleistung — plausibel/grenzwertig/unplausibel"). Neuer Helper `ampelLabel(a)` in `heizlast.astro`.

Manuell abzunehmen bleibt (Checklist in `HANDOFF-PHASE-7.md`):
- Cloudflare-Build des letzten Commits grün, `/heizlast` live erreichbar, keine Konsolen-Fehler.
- FWS-Aufgabe 2 live eintippen → Qhl = 12.55 kW ± 0.05.
- Login mit Projekt-Passwort → Cloud-Buttons aktiv → Projekt speichern → in ProjectsModal sichtbar → laden → löschen.
- Export: PDF-Druckvorschau via Chrome „Als PDF speichern", JSON-Download mit `state`/`results`/`detail`/`exportedAt`.
- DevTools Mobile-Emulation 375 + 768 px.
- Accessibility-Smoke: Tab durch Modale (Focus-Trap), ESC schliesst, Focus restauriert auf Trigger.

Tests weiterhin grün: `scripts/test-heizlast.ts` (49) + `scripts/test-heizlast-state.ts` (16).

Falls Chrome „Als PDF speichern" für die Abnahme nicht reicht, Upgrade-Pfad offen: `jsPDF` + `html2canvas` nur in `src/lib/heizlast/export.ts` → `runPdfExport` tauschen, Rest bleibt (→ `HANDOFF-PHASE-8.md` wenn nötig).

## Design-Entscheidungen
- **Hero**: Dunkler Navy-Overlay (rgba 27,42,74, 0.65) über Hintergrundbild, weisser Text
- **H1 Font**: Verwendet `var(--font-body)` (DM Sans), NICHT var(--font-heading) (Outfit) – bewusste Entscheidung für schmalere Darstellung
- **H1 Position**: Per `transform: translateY(-9vh)` nach oben versetzt, mit separatem Selektor `.hero h1.fade-up.visible` für korrekte Spezifität
- **"Unser Handwerk." Unterstrich**: SVG-basierter Pinselstrich-Effekt als `::after` Pseudo-Element auf `.h1-step3`, kein CSS text-decoration
- **Topbar**: Left/Right Split – Kontaktinfos links (aligned mit Nav-Start), Social Icons rechts (aligned mit CTA-Button-Breite)
- **Nav-Schrift**: Montserrat, 17.5px, font-weight 500
- **Header-Button**: font-weight 500, 16.5px, padding 14px 28px
- **Text-Shadow**: Alle Hero-Texte haben verstärkten text-shadow für Lesbarkeit auf dem Foto-Hintergrund
- **Impressum**: Glasmorphism-Box (rgba 255,255,255, 0.78 + backdrop-filter blur 12px) über fixem Hero-Hintergrundbild mit Navy-Overlay
