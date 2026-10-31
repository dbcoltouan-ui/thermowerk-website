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

---

## Git und Deploy (Stand 2026-10-31)

Claude arbeitet in seiner Cloud-Sandbox mit einem Klon des GitHub-Repos (`dbcoltouan-ui/thermowerk-website`, Verbindung über das Claude-Projekt «thermowerk»): Dateien dort ändern, Tests/Build laufen lassen, committen, `git push origin main` — Cloudflare Pages baut automatisch (1–3 Minuten), Claude verifiziert den Deploy per Fetch (Heizlast: Build-Stempel `<meta name="thermowerk-build">` unter `/heizlast/`). Kein Token in `.git/config`, kein Git/Node auf Daniels Laptop nötig; der frühere Weg über «Desktop Commander» auf dem Windows-Rechner (Abschnitte weiter unten) ist nur noch Referenz. Daniels Ordner liegen unter `D:\Users\Daniel\Documents\…` (Pfade mit `C:\Users\Daniel\…` in diesem Dokument sind veraltet). Offen seit Juli: ein Bild mit iStock-Wasserzeichen auf der Live-Seite (noch nicht identifiziert).

---

## Heizlast-Rechner (Neubau, live seit 2026-10-31 unter `/heizlast/`)

Der Heizlast-Rechner ist seit dem Go-Live in Session 12 der **Neubau** im Ordner `heizlast/` dieses Repos (Vite 6 + Preact + TypeScript, strict). Das alte Single-File-Tool ist abgelöst: sein Bundle liegt unter `_to_delete/public-heizlast-alt/`, sein Endpoint `functions/api/heizlast-projects.js` unter `_to_delete/`; das Entwicklungsverzeichnis `D:\Users\Daniel\Documents\Thermowerk\Heizlast Tool\` ist als archiviert markiert (`ARCHIVIERT.md`). Nichts davon wird noch ausgeliefert oder gepflegt.

**Was das Tool kann:** Heizlast in zwei Modi — FWS-Kurs Modul 3 (Verbrauchsmethode: Rechnungen, Lieferungen mit Tankständen, Zählerstände, WP-Betriebsstunden, Wärmezähler, Bauperiode) und raumweise nach SIA 384/2:2020 (Hüllen-Kaskade mit Standardaufbauten nach Baujahr) — dazu Warmwasser, Zuschläge, Speicher/Puffer/MAG, das **Heizkörper-Modul** (Q_N aus Bauart und Massen, nötige Vorlauftemperatur je Raum, Auslegungs-Vorlauf, WP-Tauglichkeit, Massnahmen), Gerätefilter (Luft/Wasser-WP-Datenbank), Bericht (PDF über den Druckdialog, JSON-Export/-Import), Projekte lokal und in der Cloud. Jeder berechnete oder angenommene Wert trägt Herkunft, Begründung und Unsicherheit. **Nicht im Umfang** (Entscheid Daniel 29./30.10.): Förderung, Bewilligung, Offerte, Hydraulik-Schemas, JAZ, Import alter Projekte.

**Verbindliche Doku (im Repo, zuerst lesen):** `heizlast/README.md` (Session-Stand, Architektur, Befehle, Datenquellen, offene Punkte), `heizlast/docs/revision/KONTEXT.md` (Fachentscheide, Arbeitsregeln, Definition of Done), `PLAN.md`, `BEFUND.md` (Revision des alten Tools) und `docs/revision/audit-s12/AUDIT-S12.md` (Abnahme). Kern-API: `heizlast/src/kern/README.md`.

**Architektur in einem Satz:** `state` (nur Rohangaben, Schema v4, Migrationen in `src/state/hydrate.ts`) → `berechne(state, daten)` (einziger Rechenpfad, `src/kern/`) → `Ergebnis` → UI (`src/ui/`, rechnet nichts), Bericht (`src/bericht/`), Persistenz (`src/state/persistenz.ts`, Cloud `cloud.ts`). Fachdaten nur in `heizlast/data/*.json` mit `_meta` (Version, Stand, Quellen). Regeln, die Build/Lint erzwingen: kein «ß»; `src/kern` und `src/daten` importieren nie aus UI/Bericht/preact.

**Befehle (im Ordner `heizlast/`, Node ≥ 22):** `npm test` (Vitest), `npm run lint` (eslint + tsc über alles), `npm run build` (tsc nur `src`/`data` + Vite nach `../public/heizlast/`, git-ignoriert), `npm run e2e` (Playwright Desktop 1280 + Mobil 390, baut und startet Preview), `npm run e2e:staging` (gegen die Live-URL). Der Root-Build `npm run build` baut zuerst `heizlast/`, dann Astro; Cloudflare Pages liefert `dist/` (Vite-Output darin unter `heizlast/`). `public/_redirects` leitet den früheren Staging-Pfad `/heizlast-neu/` auf `/heizlast/` um.

**Backend:** `functions/api/heizlast-auth.js` (Login: HMAC-signiertes Cookie `tw_heizlast_auth`, Sitzungen in D1 mit Widerruf, Sperre 5 Fehlversuche / 15 min), `functions/api/heizlast-projekte.js` (Projekte, D1-Tabelle `heizlast_projekt`, optimistisches Locking), gemeinsame Hilfen `functions/_lib/` (keine Routen), Schema `migrations/0003_heizlast_neu.sql` (die Functions legen die Tabellen selbst an). Umgebungsvariablen: `HEIZLAST_PASSWORD`, `HEIZLAST_COOKIE_SECRET` (≥ 32 Zeichen). Die alte Tabelle `heizlast_project` bleibt als Archiv in D1 (nicht löschen, wird nicht gelesen). Endpoints und Antworten: `heizlast/README.md` Abschnitt «Backend-Endpoints».

**Pflege — Heizgradtage (einziger wiederkehrender Handgriff):** `heizlast/data/heizgradtage.json` enthält Monats-Heizgradtage HGT 20/12 je SIA-Station aus MeteoSchweiz Open Data, von 2015-01 bis zum letzten vollständigen Monat des Erzeugungslaufs (`_meta.zeitraum`). Für neuere Verbrauchszeiträume meldet die App «keine Heizgradtage» und rechnet nach Tagen. Deshalb **etwa alle 1–3 Monate** (spätestens, wenn die Meldung auftaucht) im Ordner `heizlast/` ausführen: `node scripts/heizgradtage-bauen.mjs` (braucht Netz zu data.geo.admin.ch, dauert wenige Minuten), dann `npm test` (Schema-Test `tests/daten/meta.test.ts`, `tests/kern/heizgradtage.test.ts` grün), Datei committen und pushen. Claude macht das selbst, wenn Daniel es anstösst («Heizgradtage aktualisieren»).

**Arbeitsweise bei Änderungen:** KONTEXT §3/§4 gilt weiter — vor dem Start Commit-Stand notieren; Fachlogik nur mit externen Referenztests (Kurslösung, Norm, Datenblatt); jeder Fallback als `Wert` mit Herkunft; keine Rechenlogik in `src/ui/`; keine Daten-Kopien im Code; `README.md` nachführen; Tests, Lint, Build und Playwright grün, Deploy per Fetch der Live-URL (Build-Stempel `<meta name="thermowerk-build">`) verifizieren. Daniel ist Backup-Tester (Klicks im Browser, fachliche Plausibilität) — Entwicklung, Deploy und Prüfung sind Claudes Arbeit.

---

## Stack (Website)
- **Astro 5.5** – statisches Framework
- **Cloudflare Pages** – Hosting, auto-deploy per GitHub Push (thermowerk-website.pages.dev)
- **Cloudflare D1** – Datenbank für Kontaktanfragen und Heizlast-Projekte (Binding `DB`)
- **Heizlast-Rechner** – eigener Vite/Preact-Build in `heizlast/`, ausgeliefert unter `/heizlast/` (siehe Abschnitt oben)
- **Cloudflare Pages Functions** – serverseitige API (`functions/api/*.js`)
- **Sanity CMS** – vollständig integriert (Project ID: `wpbatz1m`, Dataset: `production`)
  - Studio: https://thermowerk.sanity.studio
  - Sanity Manage: https://www.sanity.io/manage/project/wpbatz1m
  - 16 Singleton-Dokumente im CMS (14 Sektionen + Impressum + Datenschutz)
  - Webhook eingerichtet: Jede Publish-Aktion in Sanity triggert automatisch einen Cloudflare Pages Build
- **Resend.com** – E-Mail-Versand (für Heizlast-Auth-Flow, falls aktiviert)

## Projekt-Dateipfade
Projektordner (Daniels PC): `D:\Users\Daniel\Documents\thermowerk-website` (Claude arbeitet in seiner Cloud-Sandbox mit einem Klon des GitHub-Repos)

- Komponenten: `src/components/`
- Globales CSS + Layout: `src/layouts/Layout.astro` (ALLES CSS ist hier, keine separaten CSS-Dateien)
- Seitenaufbau + JS: `src/pages/index.astro`
- Impressum: `src/pages/impressum.astro` (eigenständige Seite mit eigenem Header/Topbar/Footer inline, lädt Sanity-Daten via `getPage()`)
- Datenschutz: `src/pages/datenschutz.astro` (gleiche Struktur wie Impressum)
- Heizlast-Rechner: Quellcode `heizlast/` (Vite-Output `public/heizlast/` entsteht im Build, git-ignoriert)
- Bilder: `public/img/`
- Umgebungsvariablen (nie in Git!): `.env` → `SANITY_API_TOKEN`
- Cloudflare Pages Functions:
  - `functions/api/contact.js` (Kontaktformular → D1 + Resend)
  - `functions/api/heizlast-auth.js` (Login/Logout, signiertes Cookie + Sitzung in D1, Sperre nach Fehlversuchen)
  - `functions/api/heizlast-projekte.js` (Heizlast-Projekte, D1 `heizlast_projekt`)
  - `functions/_lib/` (gemeinsame Hilfen ohne eigene Route)
- Sanity-Schemas: `sanity/schemas/` (16 Schema-Dateien)
- Doku: `docs/` (z. B. Resend-API-Key-Screenshot)
- Sanity-Client: `src/lib/sanity.ts` (`getAllSections()`, `getSingleton()`, `getPage()`)
- Seed-Script: `scripts/seed-sanity.mjs`
- Sync-Scripts: `scripts/pull.bat`, `push.bat`, `deploy.bat`, `sync-all.bat`

## Aktive Komponenten (Reihenfolge auf Startseite)
Topbar → Header → Hero → Services → ManufacturerLogos → Wpsm → Steps → About → WhyHeatpump → Klima → Calculator → Region → Contact → Footer

## Sanity CMS – Architektur

### Wie Inhalte geladen werden
`src/pages/index.astro` ruft `getAllSections()` aus `src/lib/sanity.ts` — ein einzelner GROQ-Query holt alle 14 Singleton-Dokumente auf einmal. Die Daten gehen als Props an die Komponenten. Jede Komponente hat hardcodierte Fallback-Werte, falls Sanity leer oder nicht erreichbar ist.

### 16 Sanity-Schemas
`siteSettings` (Topbar/Contact/Footer), `navigation` (Header), `heroSection`, `servicesSection`, `manufacturerLogos`, `wpsmSection`, `stepsSection`, `aboutSection`, `whySection`, `klimaSection`, `calculatorSection`, `regionSection`, `contactSection`, `footerSection`, `impressumPage`, `datenschutzPage`.

### Webhook: Sanity → Cloudflare
Bei jeder Publish-Aktion im Dataset `production` wird ein POST an den Cloudflare Deploy Hook gesendet. Cloudflare baut daraufhin neu (1–3 Min). Webhook-Verwaltung: Sanity Manage → API → Webhooks.

### Cloudflare Pages Umgebungsvariablen (Production)
- `SANITY_DATASET` = `production`
- `SANITY_PROJECT_ID` = `wpbatz1m`
- `SANITY_API_TOKEN` = Editor-Token (Sanity-Fetch in Build + ggf. Writes)
- `RESEND_API_KEY` = API-Key für E-Mail-Versand aus `contact.js`
- D1-Binding `DB` (Datenbank `thermowerk-data`: Tabellen `contact_submission`, `heizlast_projekt`, `heizlast_sitzung`, `login_attempts`; `heizlast_project` = Archiv des alten Tools) — ein Binding für alle Endpoints (ein `HEIZLAST_DB` gibt es nicht)
- `HEIZLAST_PASSWORD` (Login-Passwort Heizlast) + `HEIZLAST_COOKIE_SECRET` (≥ 32 Zeichen, signiert die Login-Cookies; fehlt es, antwortet `/api/heizlast-auth` mit 500 «Server-Konfiguration fehlt»)

## Kontaktformular (D1 + Resend, seit Phase 2 Migration 2026-04-21)
Ein einziger POST aus dem Browser an `/api/contact` (siehe `src/pages/index.astro`). Die CF-Function:
1. Speichert die Anfrage in D1-Tabelle `contact_submission` (Binding `env.DB`, Status `neu`).
2. Schickt eine Benachrichtigung via Resend an `daniel@thermowerk.ch` (`reply-to` = Kundenmail). D1 ist der Wahrheitsanker — wenn Resend scheitert, bleibt die Anfrage trotzdem gespeichert, Mail-Status geht in die Response.

Honeypot-Feld `botcheck` bricht Spam vor dem DB-Write ab. Sanity-Schreiben + Web3Forms-Hybrid aus der alten Lösung sind entfernt.

## Git-Commit-Workflow

### Wie Claude Änderungen macht
1. Dateien lesen/editieren via **Read/Edit/Write-Tool** — Pfad `C:\Users\Daniel\Documents\thermowerk-website\...`
2. Commit-Message schreiben via **Desktop Commander write_file**:
   ```
   write_file("C:\Users\Daniel\Documents\thermowerk-website\commitmsg.txt", "Nachricht hier")
   ```
3. Git-Befehle via **Desktop Commander start_process** (shell: **cmd**):
   ```
   cd /d C:\Users\Daniel\Documents\thermowerk-website && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
   ```

Claude macht das **selbstständig und vollständig** – kein manueller Schritt nötig.

### Wenn nur CMS-Inhalte geändert werden (kein Code)
→ Direkt in Sanity Studio bearbeiten und publishen. Der Webhook triggert den Rebuild automatisch.

### Wenn ein neues Sanity-Schema hinzugefügt wird
1. Schema-Datei in `sanity/schemas/` erstellen
2. Schema in `sanity.config.ts` importieren + zur `schema.types`-Liste + Sidebar hinzufügen
3. Query in `src/lib/sanity.ts` → `getAllSections()` erweitern
4. Komponente anpassen, `index.astro` anpassen
5. Committen + pushen
6. Sanity Studio neu deployen: `npx sanity deploy` (im Projektordner via cmd)

## Sync-Scripts

| Script | Funktion |
|---|---|
| `scripts/pull.bat` | Exportiert alle Sanity-Daten → `sanity-export.json` |
| `scripts/push.bat` | Schreibt lokale Werte aus `seed-sanity.mjs` → Sanity (via `createOrReplace`) |
| `scripts/deploy.bat` | Git add + commit (fragt nach Message) + push → Cloudflare Rebuild |
| `scripts/sync-all.bat` | push.bat + deploy.bat in einem Schritt |

### Bild-Fallback-Logik (WICHTIG)
Komponenten prüfen: `logo.image && typeof logo.image === 'object' && logo.image.asset`. Ohne Bild in Sanity → lokale Fallbacks aus `public/img/` greifen automatisch. Bei Problemen: Bild-Feld in Sanity leeren + publishen → Fallback greift sofort.

### Troubleshooting Sync
- **403 bei Seed-Script**: Token hat nur Viewer-Rechte → neuen Editor-Token in Sanity Manage erstellen.
- **Werte stimmen nicht überein**: `pull.bat` ausführen, `sanity-export.json` mit `seed-sanity.mjs` vergleichen.
- **Sonderzeichen**: Bindestriche (-) vs. Gedankenstriche (–) beachten — per `hexdump` verifizieren wenn nötig.

## Design-Entscheidungen
- **Hero**: Dunkler Navy-Overlay (rgba 27,42,74, 0.65) über Hintergrundbild, weisser Text
- **H1 Font**: `var(--font-body)` (DM Sans), NICHT Outfit – bewusste Entscheidung
- **H1 Position**: Per `transform: translateY(-9vh)` nach oben versetzt, Selektor `.hero h1.fade-up.visible`
- **"Unser Handwerk." Unterstrich**: SVG-Pinselstrich als `::after` auf `.h1-step3`
- **Topbar**: Links Kontaktinfos (aligned mit Nav-Start), rechts Social Icons (aligned mit CTA-Button-Breite)
- **Nav-Schrift**: Montserrat, 17.5px, font-weight 500
- **Header-Button**: font-weight 500, 16.5px, padding 14px 28px
- **Text-Shadow**: Alle Hero-Texte haben verstärkten text-shadow für Lesbarkeit
- **Impressum**: Glasmorphism-Box (rgba 255,255,255, 0.78 + backdrop-filter blur 12px) über fixem Hero-Hintergrundbild mit Navy-Overlay

## Bekannte Fallstricke (WICHTIG)
- **fade-up Animation überschreibt transform**: `.fade-up.visible { transform: translateY(0) }` überschreibt jedes custom `transform`. Lösung: spezifischerer Selektor wie `.hero h1.fade-up.visible { transform: translateY(-9vh); }`.
- **Topbar-Alignment per JS**: Script in `index.astro` liest `nav.getBoundingClientRect().left` und setzt `--nav-left` als CSS-Variable; `--cta-btn-width` für Social-Icons. Messungen NACH Font-Load (`document.fonts.ready.then()`).
- **Responsive Breakpoints**: 968px (Tablet – Topbar verschwindet, Burger), 640px (Mobile – Hero-Layout).
- **Impressum/Datenschutz haben eigenen Header inline**: Bei Header-Änderungen alle 3 Dateien anpassen (Header.astro + impressum.astro + datenschutz.astro).
- **Astro Scoped Styles erreichen keine Child-Komponenten**: Für komponentenübergreifende Styles `<style is:global>` verwenden.
- **Sanity Portable Text**: Text extrahieren via `block.children.map(span => span.text).join('')`.
- **SVG-Icons aus Sanity**: Als String im Feld `iconSvg`, gerendert via `set:html`.
- **Cloudflare Error 1106 (historisch)**: CF Functions können keine Requests an andere CF-geschützte Domains senden. Deshalb wurde Web3Forms früher client-seitig aufgerufen — aktuell wird E-Mail über Resend (externe API, keine CF-Blockade) aus der Function selbst verschickt.

## Cowork-VM — Architektur-Eigenheiten
> **Warum das wichtig ist:** Zwei wiederkehrende Probleme sind KEINE „falschen Vorgehen" eines Chats, sondern fundamentale Eigenheiten der Cowork-VM-Architektur.

**Architektur:** Cowork-Agent läuft in Linux-VM, mountet den Windows-Projektordner via **virtiofs/FUSE** (`/sessions/<id>/mnt/thermowerk-website`). Edit/Write-Tool schreibt direkt auf die Windows-Seite. Bash-Tool arbeitet auf dem Linux-Mount.

### Problem 1 — „Mount-Drift"
**Symptom:** Edit/Write meldet Success, aber `git status` im Linux-Mount zeigt die Datei nicht als modifiziert.
**Ursache:** FUSE cached `stat()`-Ergebnisse; Windows-Schreiboperation invalidiert den Cache nicht immer.
**Fix:** `git update-index --refresh` (Linux) zwingt Git zu neuem stat.

### Problem 2 — „virtiofs unlink-Block"
**Symptom:** `rm -f .git/index.lock` im Linux-Mount scheitert mit `Operation not permitted`.
**Konsequenz:** Git-Operationen MÜSSEN immer über Desktop Commander auf der Windows-Seite laufen — NIE im Linux-Bash.

### Problem 3 — „index.lock hängt"
**Symptom:** `.git\index.lock` bleibt nach abgebrochenem Git-Prozess liegen; `del /f /q` in cmd hilft nicht.
**Fix:** PowerShell `Remove-Item -Force`:
```powershell
Remove-Item -Path "C:\Users\Daniel\Documents\thermowerk-website\.git\index.lock" -Force -ErrorAction SilentlyContinue
```
NUR `Remove-Item` in PowerShell. Git-Befehle danach zurück in cmd.

### Problem 4 — „Heredoc escaped `!` als `\!`"
**Symptom:** Python-Patches via `python3 << 'PY'` ... `PY` mit `!` in Strings bekommen `\!` im Output.
**Fix:** `!` vermeiden oder hinterher `sed -i 's|\\!|!|g' <file>`.

### Problem 5 — „Controlled Folder Access blockiert Löschen"
**Symptom:** `del` scheitert still im Repo-Ordner (Ransomware-Schutz).
**Fix (einmalig gemacht):** cmd.exe in Windows-Sicherheit → Ransomware-Schutz → Zulässige Apps freigegeben.

### Standard-Commit-Flow (verifiziert 2026-04-17)
1. Edits via Edit/Write-Tool (Windows-seitig).
2. `commitmsg.txt` via Desktop Commander `write_file`.
3. In cmd via Desktop Commander `start_process`:
   ```
   cd /d C:\Users\Daniel\Documents\thermowerk-website && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
   ```
4. Falls `.git\index.lock` hängt: Admin-PowerShell `Remove-Item …` (siehe oben), dann Schritt 3 retry.
5. Falls FUSE-Cache stale (nur zu Diagnose): Linux-Bash `git update-index --refresh`.

## Windows-Setup (einmalig gemacht, 2026-04-17 — nur Referenz für Re-Install)

**Windows Defender – Ausschlüsse:**
- Ordner: `C:\Users\Daniel\Documents\thermowerk-website`
- Ordner: `C:\Users\Daniel\AppData\Local\Packages\Claude_pzs8sxrjxfjjc`
- Ordner: `C:\Users\Daniel\AppData\Roaming\Claude`
- Ordner: `C:\Users\Daniel\AppData\Local\Programs\Git`
- Ordner: `C:\Program Files\nodejs`
- Prozesse: `git.exe`, `node.exe`

**Controlled Folder Access – Zulässige Apps:** `node.exe`, `git.exe`, `claude.exe`, `powershell.exe`, `cmd.exe`.

**PowerShell (Admin):**
```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```
Neustart nach LongPath-Setting.

**Cowork als Administrator:** Bei MSIX-Apps nicht möglich — Cowork bleibt im normalen User-Kontext. `C:\Users\Daniel\AppData\Roaming\Claude` ist eine virtuelle App-Sicht und aus normalem User-PowerShell heraus nicht auflösbar (Windows-Sandbox-Normalverhalten).

## Wichtige Hinweise
- Git-Pfad: `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`
- Shell für Git-Befehle: immer **cmd** (nicht PowerShell)
- Commit-Message **immer via `write_file`** schreiben (NICHT echo)
- Commit-Message darf KEIN `1:1` oder ähnliche Sonderzeichen enthalten → immer `-F commitmsg.txt`
- `.env` darf nie in Git landen (in .gitignore)
- Sanity-Packages installiert: `sanity`, `@sanity/client`, `@sanity/image-url`, `@sanity/vision`
- Sprache der Website: Deutsch (Schweiz)
- Bei Antworten: knapp halten, keine langen Aufzählungen, nur bei Auswahl oder Fragen ausführlicher
# userEmail
The user's email address is db.coltouan@gmail.com.
# currentDate
Today's date is 2026-04-21.
