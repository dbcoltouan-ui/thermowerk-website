# HANDOFF — Phase 9 / Bundle 1 (Blöcke F-K: Section-Struktur, Labels, Plausi, Save-Block, Rundung, Puffer-Default)

## Copy-Paste-Prompt für den nächsten Chat

```
Wir machen weiter an Phase 9 des Heizlast-Rechner-Redesigns. Blöcke A–E sind
abgeschlossen (letzter Commit d928ad6). Dieser Lauf bündelt Blöcke F bis K
in einer Session — 6 Blöcke zusammen, um Kontext-Overhead beim Neuaufsetzen
zu sparen. Der Rest (L + M + M1 + M2) läuft in einer zweiten Session.

Lies bitte in dieser Reihenfolge:
1. HANDOFF-PHASE-14.md (diese Datei — Bundle-Scope, Reihenfolge, Risiken)
2. CLAUDE.md — nur den Phase-9-Block-E-Eintrag + den Abschnitt
   "Cowork-VM — Architektur-Eigenheiten (Root Cause dokumentiert)"
   (Rest ist Kontext)
3. HANDOFF-PHASE-9.md — Blöcke F bis K (jeder mit Scope, Code-Pointer,
   Akzeptanzkriterien)

Dann: Blöcke in dieser Reihenfolge umsetzen, EIN COMMIT PRO BLOCK
(nicht alles am Ende), damit bei Kontext-Engpass alles bisher Geschaffte
gesichert ist:

1. Block F — Section 5 entfernen (Stub lassen, Phase-8-Muster),
   Endergebnis-Block (Qhl + Qw + Qoff + Qas = Qh) schlank in Section 7
   oberhalb der Save-Actions, Sektionen 1–7 → 1–6 umnummerieren.
   Tests: 49 + 32 müssen grün bleiben.
   Commit: "phase-9-block-f: Section 5 entfernt, Endergebnis-Block in
   Section 7, Sektionen 1–6 umnummeriert"

2. Block G — Label-Pattern vereinheitlichen (Begriff groß oben, Symbol
   + Einheit klein drunter via .hz-field__hint / .hz-field__symbol),
   InfoBox-Texte kürzen (nur "was ist es", kein "warum"),
   "— Override"-Suffix überall entfernen. Der neue Endergebnis-Block aus
   Block F entsteht direkt im neuen Label-Stil — nicht zweimal anfassen.
   Tests: unverändert (nur UI-Texte + CSS).
   Commit: "phase-9-block-g: Label-Pattern + knappe Erklärungen"

3. Block H — Plausi immer aktiv: compute.ts-Plausi-Block unabhängig vom
   Methoden-Active-State; ExportModal bekommt Checkbox
   "Plausibilitätscheck einschließen" (Default an); Print-CSS-Regel für
   hz-print-plausi-on in HeizlastLayout; ExportPart um "plausi" erweitern.
   Tests: 49 + 32 grün; ggf. kurzer Assert dass Plausi auch ohne
   methodsEnabled rechnet.
   Commit: "phase-9-block-h: Plausi always-on + Export-Checkbox"

4. Block I — Save-Block in Section 7 entschlacken:
   - Cloud-Buttons + Hinweise nur wenn body.is-auth (sonst nur lokal-Hinweis
     + Login-Button)
   - "Letzte Cloud-Speicherung: —"-Zeile raus
   - InfoBox "Wie werden Projekte gespeichert?" weg
   - "Neues Projekt"-Mülltonnen-Icon weg, stattdessen Confirm-Dialog
     ("Aktuelles Projekt verwerfen? Eingaben gehen verloren.") mit
     Sekundär-Aktion "Vorher exportieren"
   - beforeunload-Warnung wenn isDirty && isAuthenticated (Standard-
     Browser-Dialog via event.preventDefault + returnValue)
   Tests: 49 + 32 grün.
   Commit: "phase-9-block-i: Save-Block entschlackt, Confirm + beforeunload"

5. Block J — Speicher-Rundung Marktrealismus:
   - Web-Recherche: CH-WP-Markt (Hoval, Stiebel Eltron, Viessmann, Domotec,
     Buderus) — welche Speicher-Staffelung? Ergebnis in
     reference/SPEICHER-MARKT-CH.md ablegen.
   - Rundungslogik in calculations.ts (roundWWSpeicher, roundPufferVolumen)
     an Ergebnis anpassen — vermutlich 50-L-Schritte bis 300 L, ab da 100 L.
   - UI zeigt "Berechnungswert X · Empfehlung Y" (Section6Speicher).
   - test-heizlast-state.ts WW-Speicher-Assert auf neue Rundung anpassen —
     BEIDE Testläufe müssen nach Anpassung grün sein (49 + 32, ggf. 33+).
   Commit: "phase-9-block-j: Speicher-Rundung Marktrealismus + Recherche"

6. Block K — Default-Heizungspuffer-Methode:
   - Kurz-Recherche (in obiger Marktquelle mit erledigt): welche Puffer-
     Methode ist CH-Standard (Sperrzeit-basiert vs. Taktreduktion)?
   - state.ts: speicher.puffer.method bekommt passenden Default.
   - Section6Speicher.astro: "(Standard CH)"-Hinweis klein hinter der
     aktiven Methode.
   Tests: 49 + 32 grün.
   Commit: "phase-9-block-k: Heizungspuffer-Default CH"

Nach jedem Block:
- commitmsg.txt via Desktop Commander write_file
- cd /d C:\Users\Daniel\Documents\thermowerk-website && git.exe add -A &&
  git.exe commit -F commitmsg.txt && git.exe push (cmd-Shell,
  nicht Linux-Bash — siehe CLAUDE.md "Cowork-VM"-Abschnitt)
- Tests verifizieren: node --experimental-strip-types scripts/test-heizlast.ts
  und test-heizlast-state.ts

Am Ende des Bundles:
- HANDOFF-PHASE-15.md für Bundle 2 (L + M + M1 + M2) schreiben mit
  fertigem Copy-Paste-Prompt oben.
- CLAUDE.md pro Block einen kurzen Absatz ergänzen (Block F, G, H, I, J, K).
- Optional: Safety-Tag pre-layout-refactor setzen als Rollback-Punkt vor
  Bundle 2.

Bei Mount-Drift oder index.lock: Standard-Workflow aus CLAUDE.md
"Cowork-VM"-Abschnitt (PowerShell Remove-Item für Lock, Desktop Commander
cmd.exe mit C:\Progra~1\nodejs\node.exe für Windows-native Test-Runs
wenn Linux-FUSE stale ist).

Knapp antworten, keine Aufzählungen — nur bei echten Entscheidungsfragen
nachhaken.
```

---

## Warum gebündelt?

Jedes neue Chat-Setup kostet 15–25k Token (CLAUDE.md lesen, Handoff lesen,
Kontext rekonstruieren). Bei 10 Restblöcken wären das 150–250k Token nur
fürs Aufwärmen. Daniel will lieber 2 größere Sessions statt 5–10 kleine.

Split-Entscheidung:
- **Bundle 1 (F–K, 6 Blöcke):** alle UX/Logik/Struktur-Blöcke ohne großen
  Layout-Refactor. J und K haben je eine Mini-Web-Recherche (Schweizer
  WP-Markt Speicher-Staffelung, Puffer-Standard) — passen gut zusammen.
- **Bundle 2 (L + M + M1 + M2, 4 Blöcke):** thematisch Präsentation. M1
  (Desktop-Fluid-Breite) + M2 (12-Spalten-Grid) + M (Mobile/Logo) hängen
  CSS-seitig eng zusammen, L (Notizen) bringt die letzten Export-Cleanups
  dazu.

Bundle 1 ist anspruchsvoll aber machbar: 6 Blöcke, keiner davon ein großer
CSS-Refactor. Tests bleiben 49 + 32 (außer J passt die WW-Rundungs-Asserts
an).

---

## Stand nach Block E (Ausgangslage für diesen Lauf)

**EBF-Helfer erweitert: beheizt/unbeheizt + direkte Flächeneingabe.**

- `src/lib/heizlast/state.ts` — `RaumInput` um `flaecheDirekt: number | null`
  und `beheizt: boolean` erweitert; `laenge`/`breite` jetzt `number | null`.
  Neue Exporte: `raumFlaeche(r)`, `sumRaumFlaechenNetto(raeume)`.
  `sumRaumFlaechen()` bleibt als Alias auf `.netto`.
- `src/lib/heizlast/storage.ts` — sanfte v1→v1-Migration (beheizt=true,
  flaecheDirekt=null, laenge/breite zu number|null).
- `src/components/heizlast/sections/Section1Gebaeude.astro` — Tabelle um
  zwei Spalten (Fläche direkt, Beheizt-Checkbox), dreigliedrige Summenzeile
  beheizt/unbeheizt/Netto, Mobile-Layout via grid-template-areas.
- `src/pages/heizlast.astro` — renderRaumList mit 7 Spalten + agg.netto im
  Live-Modus, Event-Delegation um flaecheDirekt + beheizt, parseRaumNumber-
  Helper.
- `scripts/test-heizlast-state.ts` — zwei neue Sektionen (13 Asserts).
  Neue Summe: **49 (Rechenkern) + 32 (State) grün**.

Commit: `d928ad6` — "Phase 9 / Block E: EBF-Helfer erweitern (beheizt/
unbeheizt + Fläche direkt)".

---

## Reihenfolge-Rationale

1. **F zuerst**, weil Section-5-Entfernung und Section-7-Endergebnis-Block
   die Struktur ändern, auf der alles andere in Bundle 1 aufsetzt.
2. **G direkt nach F**, weil der neue Endergebnis-Block bereits im neuen
   Label-Stil entsteht — nicht zweimal editieren.
3. **H als Quickie dazwischen**: Plausi-Always-On ist klein und testbar.
4. **I**, um Section 7 endgültig abzuschließen (Save-Block + beforeunload).
5. **J**, Speicher-Rundung mit Recherche — eigene Commit-Einheit wegen
   Test-Anpassung.
6. **K** als Abschluss in Bundle 1 — klein, betrifft Section 6 und passt
   zum Recherche-Flow aus J.

---

## Risiken & Stolpersteine

- **Kontext-Limit:** 6 Blöcke sind grenzwertig. Wenn Block I unerwartet
  groß wird (Confirm-Modal + beforeunload + Cloud-Button-Sichtbarkeit),
  kann K oder sogar J auf Bundle 2 wandern. **Commit-pro-Block ist
  Pflicht** — dann ist alles bisher Geschaffte bereits auf main.
- **FUSE-Mount-Drift:** kann jederzeit auftreten, v.a. nach großen Edits
  an `state.ts` oder Sektions-Dateien. Siehe CLAUDE.md "Problem 1".
- **Section-Renumbering in Block F:** Alle `id="sektion-N"`-Referenzen
  müssen konsistent angefasst werden (auch in `renderAll()`, `setKpi`-
  Targets, `PrintCover`, `runExport`). Grep nach `sektion-6` und `sektion-7`
  hilft.
- **Label-Pattern in Block G:** "Override"-Suffix nicht nur im Label,
  sondern auch in Hint-Texten entfernen. `OverrideField.astro` hat seit
  Block A das neue Reset-Pattern — der Suffix ist reiner Textmüll.
- **`\uXXXX`-Escapes vermeiden:** immer echte UTF-8-Zeichen (ä/ö/ü/ß/°
  etc.) in UI-Dateien.

---

## Akzeptanz für Bundle 1 (wenn alles grün durchgelaufen ist)

- Alle 6 Blöcke einzeln committed und gepusht (sechs Commits auf `main`).
- Tests: 49 (Rechenkern) + ≥32 (State, evtl. mehr durch neue Asserts in
  H/J) grün.
- Cloudflare-Build des letzten Push grün, `/heizlast` lädt ohne
  Konsolen-Fehler.
- Section 5 weg, Sektionen 1–6 korrekt nummeriert, Endergebnis-Block in
  Section 7.
- Label-Pattern konsistent (Begriff oben, Symbol/Einheit klein drunter).
- Plausi-Kachel immer sichtbar mit Ampel (unabhängig von methodsEnabled).
- Save-Block nur für eingeloggte User sichtbar, Confirm beim
  "Neues Projekt", beforeunload-Warnung bei Dirty-Cloud-State.
- Speicher-Empfehlung zeigt "Berechnungswert X · Empfehlung Y" mit
  realistischer Staffelung.
- "(Standard CH)"-Hinweis hinter der Default-Puffer-Methode.

---

## Code-Pointer-Zusammenfassung Bundle 1

| Block | Primäre Dateien |
|-------|-----------------|
| F     | `src/components/heizlast/sections/Section5Auslegung.astro` (Stub); `Section6Speicher.astro` + `Section7Projekt.astro` (Kicker 06→05, 07→06, `id="sektion-N"`); `Section7Projekt.astro` (neuer Endergebnis-Block oberhalb `.hz-save-actions` mit `[data-kpi]`-Slots); `src/pages/heizlast.astro` (Imports, setKpi-Targets, `#sektion-5`-Scroll-Anker raus) |
| G     | Alle `src/components/heizlast/sections/*.astro` (Labels + Sublines + InfoBox-Texte); `src/layouts/HeizlastLayout.astro` oder `SectionWrapper.astro` (neue Klassen `.hz-field__hint` / `.hz-field__symbol`); `OverrideField.astro` (Suffix-Aufruf, falls vorhanden) |
| H     | `src/lib/heizlast/compute.ts` (Plausi unabhängig); `src/components/heizlast/ExportModal.astro` (+ Plausi-Checkbox); `src/lib/heizlast/export.ts` (ExportPart um `plausi`); `src/layouts/HeizlastLayout.astro` (Print-CSS `:not(.hz-print-plausi-on) [data-hz-plausi]`) |
| I     | `src/components/heizlast/sections/Section7Projekt.astro` (Save-Block-Markup); `src/pages/heizlast.astro` (beforeunload-Listener, Confirm-Modal-Logik, Auth-gated Save-Buttons-Sichtbarkeit) |
| J     | `src/lib/heizlast/calculations.ts` (neue `roundWWSpeicher`, `roundPufferVolumen`); `reference/SPEICHER-MARKT-CH.md` (neu); `Section6Speicher.astro` (Anzeige Berechnung/Empfehlung); `scripts/test-heizlast-state.ts` (WW-Speicher-Assert anpassen) |
| K     | `src/lib/heizlast/state.ts` (`speicher.puffer.method`-Default); `Section6Speicher.astro` ("(Standard CH)"-Hinweis) |

---

## Hinweise für den nächsten Chat

- **Commit-Workflow (unverändert):** `commitmsg.txt` via Desktop Commander
  `write_file`, cmd-Shell `cd /d C:\... && git.exe add -A && git.exe
  commit -F commitmsg.txt && git.exe push`. Nie Linux-Bash für Git.
  PowerShell `Remove-Item` nur für `.git\index.lock` wenn nötig.
- **Test-Runs bei FUSE-Drift:** Desktop Commander `cmd.exe /c "cd /d
  C:\... && C:\Progra~1\nodejs\node.exe --experimental-strip-types
  scripts/test-heizlast-state.ts > test-out.log 2>&1"`, dann `Read`-Tool
  auf `test-out.log`. `del test-out.log` danach.
- **Safety-Tag:** nach erfolgreichem Bundle 1 `pre-layout-refactor` setzen
  als Rollback-Punkt vor Bundle 2.
- **HANDOFF-PHASE-15.md:** am Ende von Bundle 1 schreiben (Bundle 2 =
  L + M + M1 + M2). Enthält bereits fertigen Copy-Paste-Prompt.
