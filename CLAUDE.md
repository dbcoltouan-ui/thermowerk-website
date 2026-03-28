# Anweisung für Claude – Thermowerk Website

## Stack
- **Astro 5.5** – statisches Framework
- **Cloudflare Pages** – Hosting, auto-deploy per GitHub Push (thermowerk-website.pages.dev)
- **Sanity CMS** – vollständig integriert (Project ID: `wpbatz1m`, Dataset: `production`)
  - Studio: https://thermowerk.sanity.studio
  - Sanity Manage: https://www.sanity.io/manage/project/wpbatz1m
  - Alle 14 Sektionen sind als Singleton-Dokumente im CMS erfasst
  - Webhook eingerichtet: Jede Publish-Aktion in Sanity triggert automatisch einen Cloudflare Pages Build

## Dateipfade
Projektordner: `C:\Users\Daniel\Documents\thermowerk-website`

- Komponenten: `src/components/`
- Globales CSS + Layout: `src/layouts/Layout.astro` (ALLES CSS ist hier, keine separaten CSS-Dateien)
- Seitenaufbau + JS: `src/pages/index.astro`
- Impressum: `src/pages/impressum.astro` (eigenständige Seite mit eigenem Header/Topbar/Footer inline)
- Bilder: `public/img/`
- Umgebungsvariablen (nie in Git!): `.env` → enthält `SANITY_API_TOKEN`
- Sanity-Schemas: `sanity/schemas/` (14 Schema-Dateien)
- Sanity-Client + Hilfsfunktionen: `src/lib/sanity.ts`
- Sanity Studio Config: `sanity.config.ts`
- Sanity CLI Config: `sanity.cli.ts`
- Seed-Script (einmalig): `scripts/seed-sanity.mjs`

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

### 14 Sanity-Schemas (`sanity/schemas/`)
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

### Sanity Studio Sidebar-Struktur
Die `sanity.config.ts` definiert eine benutzerdefinierte Sidebar mit allen 14 Schemas als Singleton-Einträge (feste Document-IDs, kein Erstellen/Löschen möglich).

### Webhook: Sanity → Cloudflare
- Bei jeder Publish-Aktion (Create/Update) im Dataset `production` wird ein POST an den Cloudflare Deploy Hook gesendet
- Cloudflare baut daraufhin die Seite neu (ca. 1–3 Minuten)
- Webhook-Verwaltung: Sanity Manage → API → Webhooks

### Cloudflare Pages Umgebungsvariablen
Folgende Variablen sind in Cloudflare Pages (Production) gesetzt:
- `SANITY_DATASET` = `production`
- `SANITY_PROJECT_ID` = `wpbatz1m`
- Ggf. `SANITY_API_TOKEN` (falls private Daten geladen werden müssen)

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
- **Impressum-Seite hat eigenen Header/Footer inline**: Die Datei `impressum.astro` hat eine eigene Kopie von Header, Topbar und Footer eingebettet (nicht die Komponenten). Bei Änderungen an diesen Elementen muss auch `impressum.astro` angepasst werden!
- **Astro Scoped Styles erreichen keine Child-Komponenten**: Für komponentenübergreifende Styles `<style is:global>` verwenden (z.B. Footer z-index auf Impressum-Seite).
- **Sanity Portable Text**: Wird in einigen Feldern (About intro/closing, Wpsm bodyText) als Block-Array gespeichert. Text extrahieren via `block.children.map(span => span.text).join('')`.
- **SVG-Icons aus Sanity**: Werden als String im Feld `iconSvg` gespeichert und via `set:html` Direktive gerendert: `<div set:html={fact.iconSvg}></div>`.
- **Bilder aus Sanity**: Über `urlFor(image).width(x).url()` aus `src/lib/sanity.ts` laden.

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
