# Anweisung für Claude – Thermowerk Website

> **WICHTIG:** Diese Datei ist die zentrale Wissensbasis für Claude. Jede neue Funktion, jedes neue Schema, jeder neue Workflow oder jede architektonische Änderung MUSS hier dokumentiert werden, sobald sie umgesetzt ist. So bleibt Claude in jeder neuen Session sofort auf dem aktuellen Stand.

> **AKTUELLES OFFENES PROJEKT: Heizlastrechner-Redesign** — Siehe `HANDOFF-HEIZLAST-REDESIGN.md` im Projekt-Root. Das Backend steht (Sanity-Schema, Cloudflare Functions, Auth, Env-Vars), aber der Frontend-Teil unter `/heizlast` wird komplett neu aufgebaut. Bei neuer Session zu diesem Thema zuerst `HANDOFF-HEIZLAST-REDESIGN.md` lesen.

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
