# Anweisung für Claude – Thermowerk Website

> **WICHTIG:** Diese Datei ist die zentrale Wissensbasis für Claude. Jede neue Funktion, jedes neue Schema, jeder neue Workflow oder jede architektonische Änderung MUSS hier dokumentiert werden, sobald sie umgesetzt ist. So bleibt Claude in jeder neuen Session sofort auf dem aktuellen Stand.

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

### Phasen 5–7 (offen)
Phase 5 (Executive Summary + Chart.js-Diagramm), Phase 6 (Login-Modal + Projekt-Liste-Modal + PDF-Export), Phase 7 (Testing + Deploy) — siehe `HANDOFF-PHASE-5.md`.

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
