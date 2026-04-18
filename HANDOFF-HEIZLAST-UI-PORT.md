# HANDOFF — Heizlast-UI-Port (Mockup → Astro)

## Copy-Paste-Prompt für neuen Chat

```
Ich baue den Heizlast-Rechner (thermowerk.ch/heizlast) um. Das neue UI steht
als vollständiger statischer HTML-Mockup bereit und ist vom User abgenommen.
Jetzt soll der Mockup 1:1 nach Astro portiert werden, ohne Rechenkern,
State-Logik, Tests oder Cloudflare-Funktionen zu verändern.

Bitte lies zuerst in dieser Reihenfolge:

1. `C:\Users\Daniel\Documents\thermowerk-website\CLAUDE.md`
   — speziell die Abschnitte "Heizlast-Rechner — Status" (Phase 1 bis 9)
   und "Cowork-VM — Architektur-Eigenheiten".
2. `C:\Users\Daniel\Documents\thermowerk-website\HANDOFF-HEIZLAST-UI-PORT.md`
   — dieser Handoff (komplett).
3. `C:\Users\Daniel\Documents\thermowerk-website\mockups\section-1.html`
   — die abgenommene Design-Vorlage. HTML-Struktur, CSS-Patterns und
   SVG-Icons sollen 1:1 übernommen werden.

Dann die bestehende Implementation scannen:

4. `src/lib/heizlast/state.ts` — welche Felder, welche Setter, welche
   Defaults sind schon da (inkl. `methodsEnabled`, `warmwasser.active`,
   `zuschlaege.sperrzeitActive`, `speicher.wwActive/pufferActive`,
   `heizlast.verbrauch.inklWW`/`vwuAbzug`).
5. `src/lib/heizlast/bindings.ts` — welche `data-hz-bind`-Attribute werden
   erkannt, was macht `syncOverrideClasses()`.
6. `src/lib/heizlast/compute.ts` — Hierarchie override → bstd → messung →
   verbrauch → bauperiode; WW-Abzug via `inklWW` + `vwuAbzug`.
7. `src/pages/heizlast.astro` (Alt-Stand) — welche Event-Handler, welche
   Modal-Öffnung, welche renderAll()-Slots werden schon versorgt.

Erster konkreter Schritt:

A) Lege `src/layouts/HeizlastLayout.astro` neu an — zweizeilige Topbar
   (Brand + Action-Row mit Zurücksetzen / Speichern / Projekte / Neues
   Projekt / Export / Anmelden), 3-Streifen-Layout (Body off-white,
   mittiger White-Stripe max-width var(--stripe-max)), eckige Radien,
   eigenes Token-Set mit `--hz-*`-Präfix, `.hz-scope` isoliert.
B) Baue die wiederverwendbaren Primitives in `src/components/heizlast/`:
   `SectionWrapper.astro`, `Notes.astro` (roter Punkt NUR bei trimmed
   non-empty content), `Gate.astro` (Toggle-als-Frage via
   native <details> + switch-optik), `Method.astro` (Accordion-Karte
   mit `name="heizlast-method"`), `Plausi.astro` (collapsible Quercheck),
   `OverrideField.astro` (schon da — behalten + mit mockup-Chip-Optik
   "Standard · …" ergänzen).
C) Baue die Sektions-Komponenten unter `src/components/heizlast/sections/`:
   Section1Gebaeude, Section2Heizlast, Section3Warmwasser,
   Section4Zuschlaege, Section5Speicher, Section5aDiagramm,
   Section6Projekt.
D) Verdrahte `src/pages/heizlast.astro` wie in Phase 4/5/6 dokumentiert,
   ohne den Rechenkern zu berühren. Alle `data-hz-bind`-Pfade aus dem
   alten Stand übernehmen.
E) Tests weiter grün halten:
   `node --experimental-strip-types scripts/test-heizlast.ts`     → 49 ✓
   `node --experimental-strip-types scripts/test-heizlast-state.ts` → ≥ 33 ✓
F) Acceptance: FWS-Aufgabe 2 live eintippen → Qhl = 12.55 kW (Toleranz
   ±0.05). Login + Projekte + PDF-Export funktionieren (unverändert zu
   Phase 6).

Antworten bitte knapp (siehe user preferences). Für Commits den in
CLAUDE.md dokumentierten Windows-Workflow nutzen (Desktop Commander cmd,
niemals Git-Operationen im Linux-Bash).
```

---

## Ausgangslage

Das Heizlast-UI wird von Grund auf neu gestaltet. Der User hat in mehreren
Iterationen einen statischen HTML/CSS-Mockup mitentwickelt und final
abgenommen. Der Mockup enthält alle sichtbaren Elemente, die das echte
Astro-UI haben wird:

- Zweizeilige Topbar (Brand-Row + Action-Row)
- 3-Streifen-Layout (off-white Body + mittiger white-stripe max 1140 px)
- Sektion 1 (Projekt & Gebäude, Zimmer-Helfer)
- Sektion 2 (Heizlast mit Methoden-Accordion M1-M4, Sanierungs-Addon,
  Plausi-Quercheck als collapsible)
- Sektion 3 (Warmwasser, Gate als Ja/Nein-Frage, 3 Methoden-Panes)
- Sektion 4 (Zuschläge: Sperrzeit-Gate + Qas-Block)
- Sektion 5 (Speicher: WW-Speicher-Gate + Puffer-Gate, je mit
  Empfehlungs-Zeile)
- Sektion 5a (Leistungsdiagramm mit Kennlinien und Bivalenzpunkt)
- Sektion 6 (Projekt-Zusammenfassung + Hero-Qh-Block + Save-Actions)
- PrintCover (PDF-Deckblatt)
- Drei Modals (Login, Projekte, Export)

Mockup-Pfad: `mockups/section-1.html`

---

## Was NICHT angefasst wird (Protected)

Der Rechenkern, State-Management, Persistenz und Backend sind in Phase 1–9
stabilisiert und vollständig getestet. Der Port darf AUSSCHLIESSLICH die UI
und das Glue-JS neu aufbauen.

Schutz-Zone (keine Änderungen):

- `src/lib/heizlast/types.ts`
- `src/lib/heizlast/constants.ts`
- `src/lib/heizlast/calculations.ts`
- `src/lib/heizlast/state.ts`
- `src/lib/heizlast/storage.ts`
- `src/lib/heizlast/projects.ts`
- `src/lib/heizlast/compute.ts`
- `src/lib/heizlast/bindings.ts`
- `src/lib/heizlast/export.ts`
- `scripts/test-heizlast.ts`
- `scripts/test-heizlast-state.ts`
- `functions/api/heizlast-*.js`
- `sanity/schemas/*`
- `sanity.config.ts`, `sanity.cli.ts`
- `astro.config.mjs`
- `package.json`, `tsconfig.json`
- `.env`, Cloudflare-Settings

Beide Test-Scripts müssen nach jedem Commit grün laufen:

```
node --experimental-strip-types scripts/test-heizlast.ts
  → 49 Assertions ✓ (FWS-Aufgaben 1A, 1B, 2, 3, 4 + eigenes Beispiel)
node --experimental-strip-types scripts/test-heizlast-state.ts
  → ≥ 33 Assertions ✓ (FWS-Aufgabe 2 via State → Qhl = 12.55 kW)
```

---

## Was neu gebaut wird

Folgende Dateien dürfen komplett überschrieben werden — sie werden 1:1 aus
dem Mockup portiert.

### Layout

- `src/layouts/HeizlastLayout.astro`

### Primitives (Ordner `src/components/heizlast/`)

- `SectionWrapper.astro` — Standard-Sektionshülle mit Titel und Padding.
- `Notes.astro` — aufklappbarer Notiz-Toggle mit rotem Indikator NUR bei
  trimmed non-empty content.
- `Gate.astro` — `<details>`-Block mit Switch-Optik im Summary (für
  "Warmwasser Ja/Nein", "Sperrzeit Ja/Nein", "WW-Speicher Ja/Nein",
  "Puffer Ja/Nein"). Switch = Titel = öffnet/schliesst.
- `Method.astro` — Accordion-Karte in der Heizlast-Sektion mit
  `name="heizlast-method"` (native exclusive Accordion, Chrome 120+,
  Firefox 119+, Safari 17.2+).
- `Plausi.astro` — collapsible Quercheck mit zwei Karten (W/m² mit
  Ampel, Bauperioden-Richtband).
- `OverrideField.astro` — weiterhin wie in Phase 9 Block A, aber mit
  Mockup-Chip-Optik ("Standard · 60 °C" etc.) und Reset-Pfeil.
- `InfoBox.astro` — in neuem UI als Inline-Hint-Variante (`.field__hint`),
  nicht mehr als grosse Blue-Tint-Box.
- `KpiCard.astro` — wird als `.result-hero__stat` + `.diag__meta-item`
  ersetzt. Eigenständige Komponente nicht mehr nötig, aber als dünner
  Wrapper belassen für Print-Slots.
- `SectionNotes.astro` — durch `Notes.astro` ersetzt (einfacher).
- `ExecutiveSummary.astro` — wird ersatzlos entfernt (UX-Entscheidung).
- `LeistungsDiagramm.astro` — bleibt als Chart.js-Canvas; Controls nach
  Mockup-Pattern umbauen.
- `PrintCover.astro` — nach Mockup-Layout komplett neu.
- `LoginModal.astro`, `ProjectsModal.astro`, `ExportModal.astro` — HTML
  aus Mockup; Glue-JS bleibt wie in Phase 6.

### Sektions-Komponenten (`src/components/heizlast/sections/`)

- `Section1Gebaeude.astro` — Projekt-Metadaten + Gebäude-Stammdaten +
  Zimmer-Helfer (Tabelle mit beheizt/unbeheizt/Fläche-direkt).
- `Section2Heizlast.astro` — Intro + Accordion M1-M4 + Sanierungs-Addon +
  Plausi-Collapsible. M1 enthält neu den WW-im-Verbrauch-Switch.
- `Section3Warmwasser.astro` — Intro + Warmwasser-Gate (Ja/Nein) + Seg.
  Personen/Direkt/Messung + 3 Panes + Verlust-Grid + Qw-Resultat.
- `Section4Zuschlaege.astro` — Intro + Sperrzeit-Gate + Qas-Block.
- `Section5Speicher.astro` — Intro + WW-Speicher-Gate + Puffer-Gate, je
  mit Recommend-Row.
- `Section5aDiagramm.astro` — Chart.js-Canvas mit Controls-Row,
  Meta-Row, InfoBox.
- `Section6Projekt.astro` — Summary-Grid + Result-Hero + Save-Actions.

### Hauptseite

- `src/pages/heizlast.astro` — Mount-Reihenfolge + Glue-JS (Boot,
  Bindings, Modal-Handler, Compute-Subscriber, Projekt-Render,
  Auth-Flow).

---

## Daten-Vertrag (Binding-Attribute die bleiben müssen)

Die folgenden Attribute sind das Interface zwischen DOM und Store. Sie
MÜSSEN in den neuen Komponenten exakt so vorkommen, sonst funktioniert
`bindings.ts` und `heizlast.astro`-renderAll nicht:

### Two-Way-Binding

`data-hz-bind="pfad.zum.feld"` mit optionalem `data-hz-type="number|string|boolean"`.
Liste der Pfade (nicht-erschöpfend, vollständige Liste via
`grep -rn "data-hz-bind" src/components/heizlast/sections/` im alten
Stand):

- `projectName`, `customer`, `address`, `projectStatus`
- `gebaeude.typ`, `gebaeude.lage`, `gebaeude.bauperiode`, `gebaeude.ebf`
- `gebaeude.tvoll`, `gebaeude.tvollOverride`, `gebaeude.nutzungsprofil`
- `heizlast.methodsEnabled.verbrauch|messung|bstd|override` (Boolean)
- `heizlast.verbrauch.inklWW` (Boolean — neu im Mockup integriert)
- `heizlast.verbrauch.vwuAbzug` (Number — neu sichtbar)
- `heizlast.sanierungActive`
- `warmwasser.active`, `warmwasser.method`,
  `warmwasser.speicherProzent|zirkProzent|ausstossProzent`,
  `warmwasser.deltaTOverride|deltaT`
- `zuschlaege.sperrzeitActive`, `zuschlaege.toff`, `zuschlaege.qas`
- `speicher.wwActive`, `speicher.wwTStoAus|wwTAustritt`,
  `speicher.wwTStoEinOverride|wwTEintritt`
- `speicher.pufferActive`, `speicher.pufferMethod`

### KPI-Slots (werden von `renderAll()` befüllt)

- `[data-kpi="qh"]` — Auslegungswert (Hero)
- `[data-kpi="qhlKorr"]` — korrigierte Heizlast
- `[data-kpi="plausi"]` + `[data-ampel="gruen|gelb|rot"]` auf Eltern
- `[data-kpi="wwSpeicher"]` — WW-Speicher-Empfehlung
- `[data-kpi="puffer"]` — Puffer-Empfehlung

### Summary-Slots (Section 6)

- `[data-hz-sum="projectName|customer|address|ebf|qhl|qh|…"]`

### Override-Felder

Jedes Override-Feld trägt auf dem Wrapper `[data-hz-override-field="pfad"]`
plus `data-default="…"`. Reset-Icon ruft `window.__hzClearOverride(path)`
und `window.__hzResolveDefault(path)`.

### Listen & Actions

- Zimmer-Liste: `data-hz-action="add-room|remove-room|update-room"`
- Sanierungs-Massnahmen: `data-hz-action="add-san|remove-san"`
- Personen-Einheiten: `data-hz-action="add-pe|remove-pe"`
- Verbrauchs-/Messung-/Bstd-Perioden: analog
- Save-/Auth-/Export-Buttons: `data-hz-action="save-cloud|save-cloud-new|
  open-projects|login|new-project|export"`

### Pane-Switching (Warmwasser)

- `[data-ww-pane="personen|direkt|messung"]` + `.is-active`-Klasse via
  renderAll().

### Print- und Auth-Klassen

- `body.hz-print-mode` während `window.print()`
- `body.hz-print-{part}-on` pro Export-Checkbox
- `body.is-auth` nach erfolgreichem Login

### Modal-Infrastruktur

- `[data-hz-modal-dismiss]`, `[data-hz-modal="login|projects|export"]`
- `body.hz-modal-open` Scroll-Lock
- Focus-Trap + ESC-Handler wie in Phase 7 Block A

---

## Wichtige Änderung gegenüber Phase 9 / Block B

Der Mockup nutzt native `<details name="heizlast-method">` für die
exklusive Methoden-Wahl (M1-M4). Das HTML sieht so aus:

```html
<details class="method" open name="heizlast-method">
  <summary>M1 — Brennstoffverbrauch</summary>
  <div class="method__body">…</div>
</details>
```

Der Store hat aber `heizlast.methodsEnabled` als Record mit vier Booleans.
Im Glue-JS muss deshalb ein `toggle`-Event auf jedem `<details.method>`
abgefangen werden: wenn das Element `open` wird, setze im Store alle vier
`methodsEnabled.*` auf `false` ausser dem zugeordneten Key (
`verbrauch|messung|bstd|override`). Wenn alle geschlossen sind, sind alle
vier `false` — Compute fällt auf `bauperiode` (immer-Fallback).

Eingetragene Daten in den geschlossenen Karten bleiben erhalten (Store
behält sie); Compute ignoriert sie, weil der Enabled-Flag aus ist.

---

## Dependencies (bereits installiert)

- `nanostores@^1.2` — State
- `@nanostores/persistent@^1.3` — Reserve
- `chart.js@^4` — Leistungsdiagramm

Keine neuen npm-Installationen nötig.

---

## Design-Tokens aus dem Mockup

Token-Set (`:root`-Vars) und Schriften (Outfit + DM Sans + serif für
Cover) aus `mockups/section-1.html` `<style>`-Block in
`HeizlastLayout.astro` `<style is:global>` übernehmen. Alle Tokens
bekommen das Präfix `--hz-` (z. B. `--hz-accent`, `--hz-ink-900`,
`--hz-r-sm`) damit sie nicht mit dem Marketing-Layout kollidieren.

Die CSS-Klassen im Mockup verwenden BEM-artige Namen ohne Präfix
(`.method`, `.gate`, `.summary__row`, etc.). Für die Astro-Komponenten
bleiben diese Namen — sie leben im `.hz-scope`-Scope und sind vom
Marketing-CSS isoliert.

---

## Port-Reihenfolge (empfohlen)

1. **Layout + Tokens + Topbar** — `HeizlastLayout.astro` steht und sieht
   exakt aus wie der Mockup. Test: leere Seite mit Layout rendert sauber.
2. **Section 1 + Primitives Gate/Notes** — alle Bindings verdrahten,
   Zimmer-Helfer mit Event-Delegation. Test: FWS-Aufgabe-2-EBF-Wert 241 m²
   wird in State geschrieben, nach Reload persistent.
3. **Section 2** — Methoden-Accordion + toggle-zu-methodsEnabled-Sync +
   Sanierungs-Addon + Plausi-Collapsible + WW-im-Verbrauch-Switch.
   Test: FWS-Aufgabe 2 (Öl 2100/2250 L, η aus Tabelle, toff=2,
   `inklWW=true` mit vwuAbzug=200) → Qhl = 12.55 kW.
4. **Section 3 + Section 4** — Warmwasser-Gate + Seg + 3 Panes,
   Sperrzeit-Gate + Qas. Test: Qw wird korrekt live in
   `[data-kpi="qw"]` / Result-Hero geschrieben.
5. **Section 5 + 5a** — Speicher-Gates mit Recommend-Rows,
   Chart.js-Diagramm. Test: Bivalenzpunkt wird angezeigt, Modell-
   Dropdown wechselt Kennlinie.
6. **Section 6** — Summary-Grid + Result-Hero + Save-Actions.
7. **PrintCover + 3 Modals + Glue-JS** — Login-Flow, Projekte-Flow,
   Export-Flow. Wiederverwendung der bestehenden `runExport()`,
   `listProjects()`, `loadProject()`, `deleteProject()`, `probeAuth()`
   aus `src/lib/heizlast/*`.
8. **Responsive + A11y + Focus-Trap + Save-Status-Animation** —
   wie in Phase 7 bereits codiert, aus `heizlast.astro` übernehmen.
9. **Commit + Push** — einzelner Commit pro Block, alle Tests grün.

---

## Acceptance-Kriterien (vor Final-Abnahme)

1. `/heizlast` rendert wie der Mockup (Desktop + Mobile 375 px).
2. FWS-Aufgabe 2 live eintippen → Qhl = 12.55 kW (±0.05).
3. `inklWW`-Switch in M1 wirkt sichtbar auf Qhl (mit/ohne Abzug).
4. Sperrzeit-Gate öffnet/schliesst toff-Eingabe; Qoff wird live
   aktualisiert.
5. WW-Gate an/aus ändert Qw sofort; Q-Hero reagiert live.
6. Speicher-Rundung zeigt Rohwert + marktübliche Empfehlung.
7. Diagramm zeigt Heizkennlinie + WP-Kennlinie + Bivalenzpunkt; Modell-
   Wechsel funktioniert.
8. Login + Projekt-Save → in `ProjectsModal` sichtbar → Laden → State
   wird ersetzt → UI aktualisiert.
9. PDF-Export druckt Deckblatt + ausgewählte Sektionen + Meta-Grid.
10. Alle Tests grün (49 + 33).

---

## Nach erfolgreicher Abnahme

Diesen Handoff im Repo behalten, aber eine neue Status-Zeile in
`CLAUDE.md` unter "Heizlast-Rechner — Status" ergänzen:

> **Phase 10 / UI-Port abgeschlossen (YYYY-MM-DD):** Komplettes UI aus
> Mockup `mockups/section-1.html` nach Astro portiert. Rechenkern und
> Tests unverändert. Neue Primitives: `Gate.astro`, `Notes.astro` mit
> trimmed-content-Indikator, `Plausi.astro` als Collapsible, M1 mit
> integriertem WW-im-Verbrauch-Switch. Tests 49 + 33 grün.

Danach kann der Mockup-Ordner entweder gelöscht oder als `reference/`-
Artefakt behalten werden (Entscheidung Daniel).
