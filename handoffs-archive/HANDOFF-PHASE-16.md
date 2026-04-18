# Handoff Phase 16 — Nach Phase 9 / Bundle 2

> **Kopiere den folgenden Prompt 1:1 in den neuen Chat:**

```
Neuer Chat fuer die Thermowerk Heizlast-UX. Bundle 2 (Bloecke L / M1 / M2 / M) ist abgeschlossen und auf main gepusht. Tests weiterhin 49 + 33 gruen.

Bitte zuerst lesen (in dieser Reihenfolge):
1. C:\Users\Daniel\Documents\thermowerk-website\CLAUDE.md  (Projekt-Wissensbasis; die juengsten Eintraege sind Phase 9 / Block L, M1, M2, M)
2. C:\Users\Daniel\Documents\thermowerk-website\HANDOFF-PHASE-16.md  (diese Datei — Statusbericht + moegliche Naechste Schritte)
3. C:\Users\Daniel\Documents\thermowerk-website\HANDOFF-PHASE-9.md  (Masterplan Phase 9 — alle Bloecke A..M abgehakt)

Aktueller Stand:
- Phase 9 codeseitig komplett (Bloecke A bis M)
- Tests: scripts/test-heizlast.ts = 49 gruen, scripts/test-heizlast-state.ts = 33 gruen
- Letzte Commits auf main: 8831ad0 (Block L) -> 8df92b1 (Block M1) -> ef01fdb (Block M2) -> 60b06fa (Block M)
- Offen: Manuelle Abnahme auf echten Geraeten durch Daniel (Cloudflare-Build, 1440 px Desktop-Breite, 375 px Mobile, Wortumbruch, ExportModal-Checkboxen notizenBereiche + notizenProjekt).

Moegliche naechste Schritte (auf Daniels Zuruf):
A) PDF-Renderer Upgrade (jsPDF + html2canvas) falls Chrome-Print nicht reicht
B) Chart-Polish im LeistungsDiagramm (Achsen, Legende, Tooltips)
C) Projekt-Status-Workflow (Kanban oder Filter im ProjectsModal)
D) Weitere UX-Runde nach User-Feedback aus echter Benutzung

Bitte noch nichts umsetzen — auf Daniels Antwort zu A/B/C/D oder auf konkreten Abnahme-Befund warten. Antworten knapp halten, keine Aufzaehlungen ausser bei Auswahl.
```

---

## Bundle 2 — Abschluss-Statusbericht (2026-04-17)

### Umgesetzte Bloecke

**Block L — Notizen schlanker**
- Pro-Notiz "Beim Export einbeziehen"-Checkbox aus `SectionNotes.astro` entfernt.
- "ausgefuellt"-Badge raus, ersetzt durch dezentes Navy-Icon (sichtbar nur wenn Text vorhanden).
- ExportModal bekam zwei neue Checkboxen: `notizenBereiche` (Sektionen 1-6) und `notizenProjekt` (Sektion 7).
- `export.ts` / Print-CSS entsprechend angepasst — zwei separate Body-Klassen `hz-print-notizen-bereiche-on` / `hz-print-notizen-projekt-on`.

**Block M1 — Desktop-Breite reduziert**
- Neues Token `--hz-container-max: min(92vw, 960px)` zentral gesetzt; Topbar + Container erben.
- Clamp-Typografie auf Base-Fontsize (`clamp(15.5px, 0.35vw + 14.8px, 17px)`), KPI-Zahl (`clamp(24px, 2.2vw, 30px)`).
- Fluide Abstands-Tokens `--hz-gap-section|--hz-gap-row|--hz-gap-card`.

**Block M2 — Feldbreiten intrinsisch**
- 12-Spalten-Grid `.hz-row` + `.hz-col-3/4/6/8/12` verfuegbar (opt-in fuer spaetere Refactorings).
- Direkt wirksam: Max-Widths auf Input-Ebene pro Typ (`number` 240, `select` 320, `input-with-unit` 220, `data-size="xs/sm/md/lg/full"`).

**Block M — Mobile-Polish**
- `hyphens: manual`, `overflow-wrap: break-word` global im `.hz-scope`.
- `text-wrap: balance` auf Headlines/Kicker.
- Logo auf Mobile 26 -> 32 px; Header-Hoehe Mobile 58 -> 60 px.
- `.hz-brand__text` ("Thermowerk"-Textlabel) komplett entfernt — Logo-Wortmarke reicht.

### Tests
- `scripts/test-heizlast.ts` = **49 gruen**
- `scripts/test-heizlast-state.ts` = **33 gruen**

### Offene manuelle Abnahme (Daniel)
- Cloudflare-Build auf main gruen, `/heizlast` live.
- 1440 px Desktop: sichtbarer Freiraum links/rechts, kein Rand-zu-Rand-Ausdehnen der Inhalte.
- 375 px Mobile: keine ueberlaufenden Worte, Logo 32 px, Header-Hoehe 60 px.
- Notizen-Block: Notiz-Icon nur bei Text, keine Pro-Notiz-Checkbox mehr.
- ExportModal: `notizenBereiche` + `notizenProjekt` als eigene Zeilen sichtbar, Haekchen steuern PDF-Export korrekt.

### Commits
```
8831ad0  Phase 9 / Block L: Notizen schlanker (Icon statt Badge, ExportModal-Checkboxen)
8df92b1  Phase 9 / Block M1: Desktop-Breite reduzieren (--hz-container-max + clamp-Typo)
ef01fdb  Phase 9 / Block M2: Feldbreiten intrinsisch (12-Spalten-Grid + Input-max-widths)
60b06fa  Phase 9 / Block M: Mobile-Polish (hyphens, balance, Logo 32px, Brand-Text raus)
```

### Optionale Folge-Themen
- **PDF-Renderer Upgrade:** jsPDF + html2canvas in `src/lib/heizlast/export.ts` -> `runPdfExport`, falls Browser-Print-Qualitaet nicht reicht.
- **Chart-Polish:** Achsen-Ticks, Legend-Styling, Tooltip-Inhalt im `LeistungsDiagramm.astro`.
- **Projekt-Status-Workflow:** Filter/Kanban im `ProjectsModal.astro`, Statuswechsel per Dropdown statt Edit-in-Studio.

### Safety-Tag (optional)
Vor dem naechsten groesseren UX-Umbau kann ein Safety-Tag gesetzt werden:
```
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe tag pre-content-polish
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push --tags
```
