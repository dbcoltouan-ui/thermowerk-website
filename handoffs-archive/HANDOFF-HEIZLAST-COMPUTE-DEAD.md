# HANDOFF — Heizlast v2: Compute tot trotz TDZ-Fix

> **Copy-Paste-Prompt für den nächsten Chat (alles unterhalb des Trennstrichs kopieren):**

---

Du übernimmst den Heizlast-Rechner nach einem Teil-Fix. Stand:

**Was läuft:**
- Build ist grün, Cloudflare deployed (letzter Commit `85f33b3`).
- Login via Passwort funktioniert → Cookie wird gesetzt, Cloud-Buttons werden sichtbar.
- Projektname in Section 1 tippen → Header-Tag aktualisiert live.
- Das heisst: `bootBindings()` läuft zumindest für den ersten Subscribe-Durchgang, `uiState.subscribe` fällt nicht mehr in TDZ (das war der Fix im letzten Chat).

**Was NICHT läuft (und genau das ist dein Auftrag):**
- Lage-Auswahl („Mittelland" / „Höhenlage") löst **kein** `gebaeude.tvoll`-Default aus (Tvoll-Feld bleibt leer / auf altem Wert).
- Keine KPI-Kachel zeigt einen Rechenwert — kein `[data-kpi="qhl"]`, `qhlKorr`, `qh`, `plausi`, `wwSpeicher`, `puffer` wird befüllt.
- WW-Umschaltung (ohne/mit WW) aktualisiert keine Ergebnisse.
- FWS-Aufgabe 2 eingetippt → keine `12.55 kW`-Ausgabe.
- Der Header trägt die Save/Export/Projekte-Buttons noch nicht so, wie ursprünglich geplant (siehe unten „Header-Layout").

**User-Kontext (wichtig):** Dan sitzt >24 h am Stück. Knapp auf Deutsch (Schweiz) antworten. Keine Listen in Antworten. Keine langen Erklärungen. Tests sind irrelevant für dieses Problem — die Rechenkern-Tests (49) und State-Integration (43) sind grün, das Problem liegt ausschliesslich in der DOM↔Store-Verdrahtung der v2-Komponenten.

## Was du als erstes machst

1. **Live im Browser prüfen.** Lade `https://thermowerk.ch/heizlast` via Chrome MCP (`mcp__Claude_in_Chrome__navigate`), dann:
   - `mcp__Claude_in_Chrome__read_console_messages` → Runtime-Errors?
   - `mcp__Claude_in_Chrome__javascript_tool` → manuell prüfen: `document.querySelectorAll('[data-kpi]').length`, `document.querySelectorAll('[data-hz-bind]').length`, `document.querySelectorAll('[data-hz-sum]').length`. Wenn alle >0, sind die Slots da, aber `renderAll()` läuft nicht oder matched die Attribut-Namen nicht.
   - Prüfe: Wird `heizlastCompute.subscribe` überhaupt getriggert? In Console: `window.__hzState = (await import('/src/lib/heizlast/state.ts')).heizlastState; __hzState.get()` — zeigt das den aktuellen State? Falls `heizlastCompute` nicht als globale Ref verfügbar ist, lies den Quelltext in `src/pages/heizlast.astro` und schau, ob der `renderAll()`-Subscribe-Block überhaupt aktiv ist.

2. **Selektor-Mapping gegen v2-Markup prüfen.** Die Glue-JS in `src/pages/heizlast.astro` (nach dem TDZ-Fix bei ca. Zeile 892) erwartet u.a.:
   - `[data-kpi="qhl|qhlKorr|qh|plausi|wwSpeicher|puffer|qhlVerbrauch|…]`
   - `[data-hz-sum="…"]` (diverse Status-/Summen-Slots, v.a. in Section 7)
   - `[data-ampel]` auf der Plausi-Kachel
   - `[data-hz-bind="gebaeude.lage"]` (Section 1 Select)
   - `[data-hz-action]` für diverse Buttons

   Öffne parallel:
   - `src/components/heizlast-v2/sections/Section2Heizlast.astro` — hat die die richtigen `[data-kpi="qhlVerbrauch"]`-Slots?
   - `src/components/heizlast-v2/sections/Section5Speicher.astro` — `[data-kpi="wwSpeicher"]` und `[data-kpi="puffer"]`?
   - `src/components/heizlast-v2/sections/Section6Projekt.astro` — das ist nach dem Port die Endergebnis-Sektion; hat sie die KPI-Slots für `qh`, `qhl`, `qhlKorr`?
   - `src/components/heizlast-v2/Plausi.astro` — hat das `[data-kpi="plausi"]` + `[data-ampel]`?

   Mindestens eine dieser Referenzen zeigt wahrscheinlich, dass die v2-Komponenten die KPIs **anders** adressieren als die Glue-JS erwartet (z.B. `data-hz-kpi=` statt `data-kpi=`, oder die Slots fehlen komplett).

3. **Lage → Tvoll-Default-Kette prüfen.** Suche in `src/pages/heizlast.astro` nach `resolveDefault` und `gebaeude.tvoll`. In Phase 9 / Block A war die Regel: Lage- oder Tvoll-Profil-Änderung feuert `__hzResolveDefault('gebaeude.tvoll')` → schreibt den Default ins Feld — **solange `gebaeude.tvoll` nicht im overrides-Record ist**. Mögliche Ursachen:
   - Event-Handler für `change` auf `[data-hz-bind="gebaeude.lage"]` fehlt im v2-Glue (wurde beim Port weggelassen).
   - `resolveDefault(state, 'gebaeude.tvoll')` liefert jetzt `null` weil `tvollProfil` beim ersten Laden nicht gesetzt ist.
   - Das Tvoll-Feld im v2-Markup (`OverrideField` in Section1Gebaeude.astro) hat einen anderen `bindPath`/`overridePath` als die Glue erwartet.

4. **Header-Layout korrigieren.** Ursprüngliche Abmachung: Logo oben links, darunter (zweite Zeile) oder rechts davon die Aktion-Buttons (Speichern, Projekte öffnen, Export, Login). Aktuell (in `src/pages/heizlast.astro`, inline `<header class="topbar">`, ~Zeile 1260+) sind Logo und Buttons in einer Zeile — User-Wunsch ist: zweizeilig oder grosszügiger gesetzt. Prüf die Topbar-Struktur und passe an. **Keine neue Komponente erfinden** — inline in `heizlast.astro` ändern reicht.

5. **Acceptance-Kriterien nach dem Fix:**
   - Lage „Höhenlage" → Tvoll-Feld zeigt neuen Default.
   - FWS-Aufgabe 2 eingeben (EBF 180, Bauperiode 1980–2000, Verbrauchs-Methode aktiv, Ölverbrauch 2800 L/a über eine Heizperiode, WW-Profil Wohnen+WW) → KPI zeigt **Qhl ≈ 12.55 kW**.
   - Plausi-Kachel färbt sich (grün/gelb/rot).
   - WW-Speicher + Pufferspeicher zeigen Liter-Werte.
   - Header: Logo oben, Buttons in zweiter Zeile oder klar separiert.

## Was du NICHT machen sollst

- Keine kompletten Re-Writes der Glue-JS. Der bestehende Code war in Phase 4–9 funktional; Fehler liegt in einzelnen Selektoren oder einem oder zwei fehlenden Event-Handlern im v2-Port.
- Kein Rückbau auf v1-Komponenten. Die sind gelöscht.
- Keine langen „was ich jetzt tue"-Monologe.
- Kein Vertrauen auf die Node-Tests — die testen nur den Rechenkern und den State-Store isoliert, nicht die DOM-Verdrahtung.
- **Commit immer über Desktop Commander cmd** (siehe `CLAUDE.md` → „Standard-Workflow für Commits"). Niemals `git` im Linux-Bash.

## Kontext zum Schluss

Dan hat ein angespanntes Zeitbudget und limitierten Max-Plan. Lies nur was du für den Fix brauchst. Wenn du in 5–6 gezielten Actions keinen Fortschritt siehst, schreib **sofort** einen neuen, besseren Handoff-Prompt und brich ab — nicht endlos rumprobieren. Dan akzeptiert das und will lieber einen sauberen Übergang als ein halbes Ergebnis.

Die vorherige Handoff-Datei `HANDOFF-HEIZLAST-FUNKTIONSFIX.md` ist mit dem TDZ-Fix vom letzten Chat bereits teils abgearbeitet — ignorier sie, diese Datei hier ist die aktuelle.
