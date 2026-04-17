# HANDOFF · Phase 7 — Testing + Deploy

## Copy-Paste-Prompt für den nächsten Chat

```
Hallo Claude — bitte Phase 7 des Heizlastrechner-Redesigns umsetzen.

Lies in dieser Reihenfolge:
1. CLAUDE.md (Wissensbasis, Abschnitt „Heizlast-Rechner — Status" bis Phase 6)
2. HANDOFF-PHASE-7.md (diese Datei, Scope + Abnahme-Liste)
3. Bei Bedarf: HANDOFF-PHASE-6.md für Details zum letzten Schritt

Aktueller Stand: Phase 1–6 abgeschlossen und deployed (Rechenkern, UI, State,
Executive Summary + Leistungsdiagramm, Login/Projekte/Export). Tests laufen
grün (49 + 16). Chart.js 4 + nanostores 1.2 + Sanity + Cloudflare Functions
sind eingebunden. Kein Umbau am Rechenkern mehr nötig.

Ziel Phase 7: Abnahme/Testing auf echter Cloudflare-Build-Umgebung, visuelle
Feinarbeit, Accessibility- und Print-Check, Deploy-Validierung.

Fang mit folgenden Schritten an:
1. Cloudflare-Build-Status prüfen (letzter Commit muss durchgelaufen sein).
2. /heizlast live öffnen und die Hauptflows durchklicken:
   - FWS-Aufgabe 2 eintippen → Qhl muss 12.55 kW ± 0.05 zeigen.
   - Login mit Projekt-Passwort → Cloud-Buttons aktiv.
   - Projekt speichern → in ProjectsModal sichtbar + wieder ladbar.
   - Export → PDF-Druckvorschau (Chrome „Als PDF speichern") + JSON-Download.
3. DevTools Mobile-Emulation (375px + 768px): Sticky-Header, Modale,
   Leistungsdiagramm, Sektionen.
4. Accessibility: Tab-Reihenfolge in den Modalen, ESC schliesst, Focus-Restore.

Wichtig: Tests dürfen nicht brechen, Sprache Deutsch (Schweiz) ohne Du-Anrede,
keine Emojis im UI. Antworten knapp halten, keine Task-Listen nach Erledigung.

Nach Abschluss: CLAUDE.md Phase-7-Block ergänzen, diese Datei als erledigt
markieren, committen/pushen. Falls neue Phase nötig (z. B. jsPDF-Upgrade),
HANDOFF-PHASE-8.md mit Copy-Paste-Prompt ganz oben anlegen.
```

---

## Scope Phase 7

Die Phase 7 ist bewusst klein und hat drei Kern-Aufgaben:

1. **Build + Deploy validieren** — Cloudflare muss grün sein, `/heizlast` live erreichbar, keine Runtime-JS-Fehler in der Konsole.
2. **End-to-End-Durchstich manuell** — alle Flows, die Phase 1–6 zusammenbringen, einmal vollständig durchspielen.
3. **Polish + Barrierefreiheit** — was beim Durchklicken auffällt, gleich fixen: Tab-Fokus, Kontraste, Mobile-Layout, Print-Qualität.

Wichtig: **kein Umbau der Rechenlogik oder der State-Struktur.** Die Tests `scripts/test-heizlast.ts` (49) und `scripts/test-heizlast-state.ts` (16) müssen weiterhin durchlaufen.

---

## Abnahme-Checkliste

### A. Build / Deploy
- [ ] Cloudflare-Pages-Build des letzten Commits (Phase 6) ist grün.
- [ ] `https://thermowerk.ch/heizlast` lädt ohne 500/404.
- [ ] Browser-Konsole: keine uncaught exceptions, keine 404 auf Assets.
- [ ] Service-Worker/Cache-Check: Hard-Reload (Ctrl+Shift+R) funktioniert sauber.

### B. Rechenkern-Smoketest (auf Live)
- [ ] FWS-Aufgabe 2 eintippen (EBF 180, Ba 2500 l Öl, tvoll 1800, θi 20, θne −8): **Qhl = 12.55 kW ± 0.05**.
- [ ] Sanierung hinzufügen (z. B. „Fenster erneuert"): Qhl sinkt multiplikativ.
- [ ] Warmwasser-Personen-Methode: 4 Personen → qwwTag ≈ 200 l/Tag → Qw plausibel.
- [ ] Plausibilitäts-Ampel schaltet bei unrealistischen Eingaben auf gelb/rot.

### C. Login + Projekt-Flow
- [ ] Klick auf „Anmelden" öffnet `LoginModal`, ESC schliesst.
- [ ] Falsches Passwort → Fehleranzeige, Cookie wird nicht gesetzt.
- [ ] Richtiges Passwort → `body.is-auth` ist da, Cloud-Buttons aktiv, Header-Button zeigt „Abmelden".
- [ ] Projekt speichern (neu) → erscheint in `ProjectsModal`.
- [ ] Projekt in `ProjectsModal` anklicken → `state` wird ersetzt, KPIs updaten.
- [ ] Projekt löschen mit Confirm → verschwindet aus Liste, lokal aktuelles Projekt bleibt bestehen.
- [ ] Abmelden → Cloud-Buttons werden wieder disabled, `projectList` ist leer.

### D. Export
- [ ] Klick auf „Exportieren" öffnet `ExportModal`.
- [ ] PDF-Export (Chrome „Als PDF speichern"):
  - Deckblatt mit KPIs stimmt (Qh, Qhl, WW-Speicher, Puffer).
  - Leistungsdiagramm ist als Bild drin (nicht leer — der `toDataURL`-Screenshot muss greifen).
  - Seitenzahlen unten rechts, „Thermowerk" unten links.
  - Abwählbare Teile (Formeln, Notizen) fehlen tatsächlich, wenn Checkbox aus.
  - Keine Topbar/Modal/Footer-Reste im PDF.
- [ ] JSON-Export: Datei lädt, öffnet als gültiges JSON, enthält `state` + `results` + `detail` + `exportedAt`.
- [ ] Dateiname ist pro Projekt sinnvoll (`Thermowerk-Heizlast-<Projekt>.pdf`).

### E. Mobile / Responsive (DevTools 375 px + 768 px)
- [ ] Exec-Sticky bricht nicht aus (max. 2 Spalten bei < 560 px).
- [ ] Modale sind scrollbar und nicht abgeschnitten.
- [ ] Leistungsdiagramm: Canvas passt in die Breite, Controls stapeln sich.
- [ ] Sektion-2-Toggles und WW-Panes funktionieren per Touch.
- [ ] Formulare: Number-Inputs öffnen mobile Numpad (type="number").

### F. Accessibility
- [ ] Tab-Fokus läuft in jedem Modal sinnvoll vom ersten Field bis zum Submit.
- [ ] ESC schliesst jedes Modal.
- [ ] `aria-modal="true"` + `aria-labelledby` auf allen Modalen (ist gesetzt, nur doppelt prüfen).
- [ ] Focus-Restore nach Schliessen auf den Trigger-Button.
- [ ] Kontrast: Status-Badges lesbar, Plausi-Ampel nicht nur durch Farbe kommuniziert (Text daneben).

### G. Print-Qualität (falls ungenügend → Upgrade-Pfad)
Wenn die Print-CSS-Variante in Chrome/Edge nicht ausreicht:
- Option 1 (empfohlen): `jsPDF` + `html2canvas` als Alternative zu `window.print()` — nur `runPdfExport` in `src/lib/heizlast/export.ts` umbauen, alles andere bleibt.
- Option 2: Puppeteer/Playwright in einer Cloudflare Worker Function (komplex, Kosten, Cold Start).
→ Erst beurteilen nach tatsächlichem Abdruck. Wenn Chrome-Print-to-PDF sauber aussieht, kein Upgrade nötig.

---

## Offene Punkte aus Phase 6 (nice-to-have)

- Aktives Projekt im `ProjectsModal` visuell highlighten (z. B. roter Rand auf der Card, `data-active="true"`).
- Live-Projekt-Name im Header anzeigen, wenn `state.projectId` gesetzt ist.
- Save-Status-Pill (`[data-hz-save-status]`) mit kurzer Animation bei Erfolg.
- Keyboard-Shortcut `Ctrl+S` für Save-Cloud (wenn eingeloggt).

Diese Punkte sind **nicht blockierend** und können nach Phase 7 separat angegangen werden, falls noch Zeit ist.

---

## Deploy-Workflow (wenn Fixes nötig)

```
1. Dateien editieren.
2. Desktop Commander:
   write_file("C:\Users\Daniel\Documents\thermowerk-website\commitmsg.txt",
              "Phase 7: <kurze Beschreibung>")
3. cmd:
   cd /d C:\Users\Daniel\Documents\thermowerk-website ^
   && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A ^
   && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt ^
   && C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
4. Cloudflare rebuildet automatisch (1–3 Min).
5. Hard-Reload auf /heizlast, nochmal durchklicken.
```

---

## Definition of Done

- Alle Haken aus A–F sind gesetzt.
- Tests `test-heizlast.ts` (49) + `test-heizlast-state.ts` (16) sind grün.
- `/heizlast` ist auf Production live und funktioniert auf Desktop + Mobile.
- CLAUDE.md hat einen Phase-7-Block (abgeschlossen).
- Diese Datei (`HANDOFF-PHASE-7.md`) wird am Ende mit „abgeschlossen" markiert oder durch Phase 8 ersetzt.
