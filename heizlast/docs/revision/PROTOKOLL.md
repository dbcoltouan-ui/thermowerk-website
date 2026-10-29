# Revisions-Protokoll — Heizlast Tool

Zweck: Nachvollziehbarkeit aller Prompts und daraus folgenden Änderungen. Wird nach Finalisierung + erfolgreicher Prüfung gelöscht.

## 2026-10-29 14:21 — Prompt 1 (Daniel)
Zugriff auf Thermowerk-Ordner und Live-Heizlasttool prüfen.
→ Zugriff eingerichtet: C:\...\Gebäudetechnik Coltouan, D:\...\Documents\Thermowerk, D:\...\Documents\thermowerk-website.
→ Festgestellt: Live (thermowerk.ch/heizlast) = Heizlast Tool\build\dist\index.html (byte-identisch), Commit 6577db2 vom 01.05.2026.

## 2026-10-29 14:47 — Prompt 2 (Daniel): Auftrag Gesamtrevision
Extrem kritische Gesamtrevision (Fachlogik, Praxis, Datenfluss, Optik, UX, Redundanzen, Edge Cases) + priorisierter Plan Überarbeitung/Neubau. Zwei Modi: FWS-Kurs und raumweise (SIA 384.201 / EN 12831). Mehrstufige, sichtbare Fallbacks. Bedingte Felder, Single Source of Truth.

## 2026-10-29 15:02 — Prompt 3 (Daniel): Präzisierungen
1. Recherche auch in D: erlaubt (freigegeben: D:\Samsung Kopie 2026, D:\Users\Daniel\Documents).
2. Priorität Heizkörper-Modul: Erfassung nach Bauart/Typ + Massen/Gliederzahl, Normleistung EN 442 / Herstellertabellen als Fallback, Exponent-Umrechnung, nötige VL-Temp je Raum, WP-Tauglichkeit, zu kleine HK markieren. Optional, aber voll integriert (Datenfluss, Dashboard, Bericht).
3. Freiheit beim Umbau; Backup vor jedem Eingriff; eigene Arbeits-Backups mit Zeitstempel + Protokoll; gespeicherte Projekte müssen nicht erhalten bleiben; felsenfeste Bausteine (Login etc.) übernehmen, aber sauberes neues System gewinnt im Zweifel.
4. Befund/Plan/Doku als Markdown; an Daniel zusätzlich PDF oder Text im Chat; Claude baut alles; fertige Prompts falls mehrere Sessions nötig.
5. Nicht aufblähen, aber High-Class; Agents und günstigere Modelle erlaubt (Modell je Schritt angeben); strikt sequentiell mit Abschluss + Prüfung; max. 4 Fragerunden (1 verbraucht).

### Aktionen
- 2026-10-29_140351: Backup BACKUP/heizlast-tool_pre-revision_2026-10-29_140351.tgz (ohne node_modules/BACKUP/REVISION).
- REVISION/ angelegt (BEFUND.md, PLAN.md folgen; _work/ = Arbeits-Backups).

## 2026-10-29 15:02–16:00 — Revision durchgeführt
- Code/Daten/Wissensbasis/FWS-Textauszüge in die Cloud-Sitzung gestaged (REVISION/_work/transfer/*.tgz), Testsuite (341/341) und Bundle-Build dort reproduziert (byte-identisch mit Live).
- Vier Prüf-Agents: Fachlogik (Fable), Heizkörper (Fable), UX/Datenfluss (Opus, 30 Playwright-Screenshots), Code/Daten/Build/Backend (Opus). Backend-Auth mit gefälschtem Cookie getestet → offen.
- Ergebnis: REVISION/BEFUND.md (198 Befunde: 15 K / 56 H / 82 M / 45 N), PLAN.md (Empfehlung Neubau auf bereinigtem Kern, 12 Sessions + optional Session 0 Hotfix, fertige Prompts), KONTEXT.md (Architektur-Entscheide, Regeln, Definition of Done); Teilberichte befund_*.md; PDFs für Daniel.
- Keine Änderung am Tool-Code oder am Live-Stand in dieser Session.

## 2026-10-29 16:02 — Prompt 5 (Daniel)
Kein Hotfix am alten Tool (Neubau). Design: Farben und abgerundete Kacheln/Konturen behalten, Rest frei. Ablauf: je Session neuer Chat im Projekt «thermowerk».
→ KONTEXT.md (Design, Regeln 8/9) und PLAN.md (§2 entfällt) aktualisiert; KONTEXT/PLAN/BEFUND in die Projekt-Wissensbasis geschrieben.

## 2026-10-29 16:06 — Session 1: Fundament (Opus-Prompt aus PLAN §4, ausgeführt mit Fable 5.1)
Prompt: Repo klonen, PC-Zugriff, `heizlast/` anlegen (Vite+Preact+Signals+TS strict, Vitest, Playwright, eslint), Pages-Build, Referenzmaterial, minimale Shell, README/PROTOKOLL.

### Entscheide
- Staging-Pfad `/heizlast-neu/` (Vite `base`), Output `public/heizlast-neu/` (gitignored, wird im Pages-Build erzeugt). Live `/heizlast/` unberührt.
- Root-`package.json` `build` = `npm --prefix heizlast ci && npm --prefix heizlast run build && astro build`; `.node-version` = 22 im Root.
- Design: Tokens (Inks/Navy/Rot, Radien 0–4 px = eckig, wie im alten `style.css` Zeile 53) übernommen; Layout neu (Topbar · sticky Schrittleiste · Inhalt ≤ 760 px · Dashboard rechts 320 px; mobil Dashboard als aufklappbare Leiste unten).
- eslint: eigene Regel `thermowerk/kein-eszett`; `no-restricted-imports`/`no-restricted-globals` für `src/kern` + `src/daten`; zusätzlich Schichten-Test in Vitest.
- Herkunftsmodell als Typ `src/kern/wert.ts` bereits in S1 angelegt (keine Rechenlogik).
- Zusätzlich ins Repo übernommen (für S9/S11): `referenz/alt-export/` (export.mjs, export-offerte.mjs), `referenz/alt-data/*.json`, `referenz/alt-style/style.css`, `referenz/alt-tests/`.
- FWS-PDF-Auszüge: 5 Dateien mit Text (Foliensätze 01/02, M3 Skript, Aufgaben+Lösungen, Praxisbeispiel); Pläne/Situationspläne sind reine Bilder (kein Text) und wurden weggelassen.

### Änderungen
- Backup altes Tool: `REVISION\_work\backups\heizlast-tool_pre-S1_2026-10-29_150728.tgz` (ohne node_modules/BACKUP/_work/build/dist).
- Neu: `heizlast/` (Konfig, src, tests, e2e, docs, referenz), Root `.gitignore`, `.node-version`, `package.json`.

### Prüfung
- `npm test` 5/5 grün · `npm run lint` ohne Fehler · `npm run build` ok (29.8 kB JS / 10.4 kB CSS) · Playwright 4/4 grün (Desktop 1280, Mobil 390), Screenshots `docs/revision/shots-neu/s1-*.png`.
- Root `npm run build` (heizlast + astro) erfolgreich; `dist/heizlast-neu/` und `dist/heizlast/` beide vorhanden.
- Behobener Stolperstein: scrollbare Schrittleiste vergrösserte auf Mobil die Layout-Viewport (flex min-width auto) → `.shell > * { min-width: 0 }`.

## 2026-10-29 16:34 — Prompt 6 (Daniel): Rollen + Design bestätigt
Radien der neuen Schritt-0-Seite bestätigt (eckig bleibt). Neu Regel 10: Daniel ist kein Entwickler; Entwicklung/Backend/Deploy/Konfiguration inkl. Prüfung sind Claudes Arbeit, Daniel nur Backup-Tester; bei Wartezeiten erneut prüfen, erst abschliessen wenn bestätigt.
→ KONTEXT.md (§2 Design, §3 Regel 10, §4 Definition of Done «Deploy von Claude verifiziert»), PLAN.md (§3 Prüfspalte, §4 alle Prompts: «Daniel bestätigt/Review/Secret setzen» → Claude prüft selbst) angepasst; in Repo, Projekt-Wissensbasis und REVISION-Ordner nachgeführt.
→ Deploy Session 1 von Claude verifiziert: https://thermowerk.ch/heizlast-neu/ liefert HTTP 200 mit der neuen Shell; /heizlast/ unverändert 200.
