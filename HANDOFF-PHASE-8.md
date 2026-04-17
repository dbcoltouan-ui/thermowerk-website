# HANDOFF · Phase 8 — Header-Umbau, Section-1-Polish, Unicode-Fix, Mobile-Feinschliff

> **STATUS: ABGESCHLOSSEN (2026-04-17)** — siehe CLAUDE.md „Phase 8 abgeschlossen".
> Code-Abnahme A–G erledigt. Manuelle Mobile-Emulation (375 / 390 px) + Live-Test + Cloudflare-Build-Check stehen beim User.


## Copy-Paste-Prompt für den nächsten Chat

```
Hallo Claude — bitte Phase 8 des Heizlastrechner-Redesigns umsetzen.

Lies in dieser Reihenfolge:
1. CLAUDE.md (Wissensbasis, Abschnitt "Heizlast-Rechner — Status" bis Phase 7)
2. HANDOFF-PHASE-8.md (diese Datei, Scope + Abnahme-Liste)
3. Falls nötig: HANDOFF-PHASE-7.md für Details zum Polish-Stand

Aktueller Stand: Phase 1–7 deployed. Rechenkern, UI, State, Leistungsdiagramm,
Login/Projekte/Export, Focus-Trap, Live-Projektname, Save-Animation. Tests grün
(49 + 16).

Ziel Phase 8: Daniel hat die Live-Version auf Mobile durchgeklickt und eine
Reihe von UX-Problemen gemeldet. Kernpunkte:

1. **Unicode-Escapes im UI** — an vielen Stellen erscheinen Rohsequenzen wie
   `GEB\\U00E4UDE`, `\\u00fc`, `\\u03b7` im sichtbaren Text. Alle `\\uXXXX`-
   Strings in `src/components/heizlast/**`, `src/pages/heizlast.astro`,
   `src/layouts/HeizlastLayout.astro`, `src/lib/heizlast/**` systematisch
   durch echte UTF-8-Zeichen (ä, ö, ü, ß, η, θ, …) ersetzen. Keine Lodash-
   mässigen Sammel-Replacements blind — erst grep, dann Datei für Datei prüfen,
   ob die Strings in Attributen, Labels, Select-Optionen, Placeholders stehen
   und ob sie bereits HTML-escaped werden.

2. **Sticky-Header komplett umbauen** (`HeizlastLayout.astro` + `heizlast.astro`)
   - Links: nur noch Logo (Thermowerk-SVG).
   - Mitte: Projektname / Adresse / Kunde (aus state), je nach Platz gestapelt.
   - Rechts: Buttons für Speichern (Cloud), Projekte, Export/PDF, Anmelden/
     Abmelden. Auf Mobile als Icon-Only-Buttons mit aria-label. Speichern/
     Projekte nur aktiv bei Auth.
   - Keine Kennzahlen mehr im Header.

3. **ExecutiveSummary entfernen** (`src/components/heizlast/ExecutiveSummary.astro`)
   Komplett ausbauen. Die `setKpi()`-Aufrufe in `heizlast.astro` bleiben — sie
   schreiben weiterhin in die Section-5-Karten. Alle `[data-kpi]`-Nodes im
   ExecutiveSummary verschwinden dadurch. Import + Einbindung raus.

4. **Section 1 (Projekt-Kopf) Redesign**
   - Navy-Block ersetzen durch hellen Blue-tint (var(--hz-blue-tint), wie
     InfoBox). Labels und Inputs in Navy/Dark. Rand + Schatten dezent.
   - Tvoll-Box oben rechts (als Aside) entfernen — tvoll erscheint nur noch
     beim Feld selbst oder in Section 5.

5. **Section 2 Methoden-Toggles**
   - Aktiver Methoden-Toggle muss auch im eingeklappten Zustand erkennbar
     sein: rot/aktiv-Stil (roter Balken links, roter Akzent) bleibt sichtbar,
     ohne aufklappen zu müssen. Deutliche visuelle Zuordnung "diese Methode
     ist gewählt".

6. **Mobile-Feinschliff** (375 + 390 px, echte Chrome-Mobile-Emulation)
   - Content-Block zentriert, symmetrische Rände links/rechts. Kein
     overflow-x, keine sichtbare Scrollbar durch zu breite Elemente.
   - Schriftgrössen anpassen: H1/H2 kleiner auf Mobile (clamp beachten).
   - Buttons und Inputs passen in ihre Container (keine Text-Overruns).
   - Header (neuer) darf auf Mobile nichts überlappen. Button-Label ggf.
     ausblenden, nur Icons zeigen.

7. **Testing nach den Änderungen**
   - `npm run test:heizlast` (49) + state-Test (16) grün halten.
   - Lokal im Astro-Dev-Server visuell prüfen.
   - Nach Deploy: Daniel testet Mobile (Pixel/Chrome DevTools), meldet zurück.

Regeln:
- Sprache: Deutsch (Schweiz), kein Du-Anrede im UI, keine Emojis.
- Keine Rechenkern-Änderung — state.ts / calculations.ts / compute.ts bleiben.
- Keine `\\uXXXX`-Escapes in neu geschriebenem Code — echte Zeichen.
- Vor jedem Bearbeiten der Datei `src/lib/heizlast/state.ts` bitte beachten,
  dass Cowork-Mount und Windows-File-System zeitweise divergieren können.
  Wenn nötig, die Datei am Ende mit `git status` + `git diff --stat` gegen-
  prüfen, dass sie nicht versehentlich verkürzt wurde.

Nach Abschluss:
- CLAUDE.md Phase-8-Block ergänzen.
- Diese Datei als erledigt markieren.
- Committen + pushen. Commit-Message via commitmsg.txt + `-F commitmsg.txt`.
- Antworten knapp halten, keine langen Aufzählungen, nur bei Auswahl ausführlich.
```

---

## Scope Phase 8

Phase 7 war codeseitig grün, aber der Live-Check auf Mobile hat sechs grosse UX-Themen offengelegt, die vor einer Endabnahme behoben werden müssen:

1. **Unicode-Escape-Sequenzen** im UI sichtbar (`\u00e4`, `\u03b7`, `\U00E4UDE` etc.).
2. **Sticky-Header-Umbau** auf Logo + Projektinfos + Aktionen. Kennzahlen raus.
3. **ExecutiveSummary** komplett entfernen.
4. **Section 1 Projekt-Kopf:** Navy → Blue-tint, keine Tvoll-Side-Box.
5. **Section 2 Methoden:** aktiver Zustand muss eingeklappt sichtbar bleiben.
6. **Mobile-Layout:** zentriert, symmetrische Rände, keine Overflow-/Schrift-Probleme.

---

## Abnahme-Checkliste

### A. Unicode-Fix
- [ ] Keine `\uXXXX`-Sequenz mehr im gerenderten UI (manuell 10 zufällige Views prüfen).
- [ ] Alle betroffenen Dateien (`.astro`, `.ts` unter heizlast/) enthalten echte Umlaute.
- [ ] Keine Regressionen bei Placeholder, Select-Options, Labels.

### B. Header-Umbau
- [ ] Header: Logo | Projektinfo | Aktionsbuttons.
- [ ] Projektname wird live aus State gelesen.
- [ ] Adresse + Kunde sichtbar (ggf. zweite Zeile oder auf Mobile ausgeblendet).
- [ ] Buttons: Speichern, Projekte, Export, Login. Speichern/Projekte disabled ohne Auth.
- [ ] Mobile: Buttons als Icons only, Labels als aria-label.
- [ ] Kein Overlapping mit Logo oder Sticky-Untersektion.

### C. Exec-Summary
- [ ] Komponente gelöscht / nicht mehr importiert.
- [ ] Keine `[data-kpi="qh"]`/`qhlKorr`/`plausi`/`wwSpeicher`/`puffer` mehr im Exec-Scope; die Section-5-Karten bleiben.

### D. Section 1
- [ ] Blue-tint Hintergrund statt Navy.
- [ ] Dunkle Schrift, gute Lesbarkeit.
- [ ] Keine Tvoll-Aside-Box — Wert nur noch beim Eingabefeld.

### E. Section 2
- [ ] Aktiver Toggle ist auch eingeklappt klar erkennbar (roter Balken/Akzent/Badge).
- [ ] Nur ein Toggle gleichzeitig aktiv.

### F. Mobile 375 + 390 px
- [ ] Content zentriert, symmetrische Rände.
- [ ] Keine horizontale Scrollbar.
- [ ] Alle Texte innerhalb ihrer Container.
- [ ] Schriftgrössen angenehm lesbar, nicht zu gross/klein.
- [ ] Inputs und Buttons berühren nicht den Rand.

### G. Tests + Deploy
- [ ] `node --experimental-strip-types scripts/test-heizlast.ts` = 49/0.
- [ ] `node --experimental-strip-types scripts/test-heizlast-state.ts` = 16/0.
- [ ] Cloudflare-Build grün.
- [ ] Daniel bestätigt auf Live.

---

## Definition of Done

- Alle Haken A–G gesetzt.
- CLAUDE.md Phase-8-Block ergänzt.
- Diese Datei markiert als "abgeschlossen".
- Commit gepusht, Cloudflare deployed.
