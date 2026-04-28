# Debug-Auftrag — Heizlast-Rechner rechnet falsch

## Was kaputt ist (Daniel-Beobachtung 2026-04-22)

1. **Toggle „Verbrauch enthält WW-Erzeugung" ist tot** — An- und Abklicken verändert das Ergebnis nicht.
2. **Sperrzeit liefert andere Werte als früher** — Verdacht auf Regression beim Rechenkern.

## Kontext, bevor du etwas anfasst

- Der **gesamte Thermowerk-Ordner wurde am 2026-04-22 umgezogen**:
  - alt: `C:\Users\Daniel\Documents\Claude\Projects\Final Heizlast\`
  - neu: `C:\Users\Daniel\Documents\Thermowerk\Final Heizlast\`
    Beim Umzug/Aufräumen wurden evtl. Dateien verschoben, umbenannt oder überschrieben. **Backups existieren** in `Thermowerk\Final Heizlast\Backup\` (ZIPs mit Zeitstempel).
- Die **Live-Kopie** liegt unter `C:\Users\Daniel\Documents\thermowerk-website\public\heizlast\index.html`. Kann sein, dass Live und Master auseinander laufen.
- Daniel ist **Laie**, kein Entwickler. Keine nackten Shell-Kommandos. Jede geplante Aktion kurz in Klartext ankündigen, **vor** dem Zugriff.

## Pflichtlektüre (in dieser Reihenfolge, bevor du Code anfasst)

1. `C:\Users\Daniel\Documents\thermowerk-website\CLAUDE.md` — Architektur-Überblick, Cowork-VM-Eigenheiten, Commit-Flow
2. `C:\Users\Daniel\Documents\Thermowerk\Final Heizlast\STAND-DER-DINGE.md` — letzter bekannter Stand
3. `C:\Users\Daniel\Documents\Thermowerk\Final Heizlast\CHANGELOG.md` — was zuletzt geändert wurde
4. `C:\Users\Daniel\Documents\Thermowerk\Final Heizlast\BACKUP-GUIDE.md` — Backup/Restore-Prozedur

## Diagnose-Schritte (streng in dieser Reihenfolge)

### Schritt 1 — Bestand aufnehmen, nicht ändern

- Liste der Backups in `Thermowerk\Final Heizlast\Backup\` ausgeben (Dateinamen + Datum + Grösse).
- Stand aktueller `index.html` in `Thermowerk\Final Heizlast\` und `thermowerk-website\public\heizlast\index.html` vergleichen (sind sie identisch? Byte-Grösse, SHA?).

### Schritt 2 — Letzten funktionierenden Stand identifizieren

- Mit Daniel abklären, wann es zuletzt korrekt gerechnet hat. Passendes Backup-ZIP aussuchen.
- Backup in temporären Ordner entpacken (**nicht** in den Live-Ordner!), um Vergleich zu ermöglichen.

### Schritt 3 — Gezielt diffen, nicht raten

Fokus-Regionen im `index.html`:

- **WW-Toggle-Handler** — Event-Listener und State-Variable für die Checkbox „Verbrauch enthält WW-Erzeugung".
- **`computeQwDetail` / `computeQwVerbrauch` / WW-Abzug-Logik** — wird die Toggle-State tatsächlich gelesen?
- **`computeQhlRaw`** — Hauptkaskade FWS.
- **`sperrzeitAktiv` / `computeQoff`** — Sperrzeit-Pfad.

### Schritt 4 — Hypothese formulieren, *dann* fragen

Mögliche Ursachen (vom wahrscheinlichsten zum abwegigsten):

- Beim Aufräumen wurde eine ältere `index.html`-Version live gezogen.
- Ein Patch zum Sperrzeit-Modell ist unvollständig reingekommen (halb-migrierter State).
- Toggle-Checkbox-ID/Name wurde geändert, Handler hängt ins Leere.

**Hypothese mit Beleg (Zeilennummern, Code-Snippet) Daniel vorlegen**, bevor gefixt wird.

### Schritt 5 — Fix-Entscheidung: Restore vs. Patch

- Wenn Backup nachweislich korrekt rechnet und nur **wenige** gewollte Änderungen seitdem dazukamen → **Restore aus Backup** ist sicherer.
- Wenn seit dem letzten guten Backup viele gewollte Änderungen passiert sind → gezielter **Patch** auf aktueller Datei.
- **In beiden Fällen vorher ein frisches Backup** via `backup.ps1` ziehen.

## Regeln

- **Kein Fix ohne Daniels OK.** Erst Hypothese + Plan, dann Freigabe einholen, dann Änderung.
- **Backup-vor-Änderung** ist Pflicht — Skript liegt unter `Thermowerk\Final Heizlast\scripts\backup.ps1`.
- **Testen heisst bei Daniel: Doppelklick auf `Thermowerk\Final Heizlast\index.html`** — sag ihm klare Test-Cases (welche Werte eintragen, was muss rauskommen, wo hinklicken für den Toggle).
- Git-Operationen nur via Desktop Commander / cmd (siehe `thermowerk-website\CLAUDE.md` Abschnitt „Cowork-VM").
- Live-Deploy (`public/heizlast/index.html` überschreiben + Commit + Push) erst wenn Master wieder korrekt rechnet und Daniel bestätigt hat.

## Erwartete erste Antwort an Daniel

Keine Code-Änderung, sondern:

1. Bestätigung, dass du die Pflichtlektüre gelesen hast (1-2 Sätze pro Datei).
2. Liste der Backups.
3. Diff-Status Master ↔ Live.
4. Vorschlag, welches Backup du als Referenz entpacken willst.
5. Frage an Daniel, ob du so weitermachen sollst.
