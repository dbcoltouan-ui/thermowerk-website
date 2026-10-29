# src/kern — Rechenkern

Reine TypeScript-Funktionen, kein DOM, kein Dateisystem, kein Import aus `src/ui` oder `src/bericht` (eslint erzwingt das).

Einziger Rechenpfad ab Session 6: `berechne(state, daten) → Ergebnis`. Jeder berechnete oder ergänzte Wert ist ein `Wert` mit Herkunft (siehe `wert.ts`).

| Modul | Session | Inhalt |
|---|---|---|
| `wert.ts` | 1 | Herkunftsmodell (Typ `Wert`) — Grundlage für alle Kern-Module |
| `fws.ts`, `warmwasser.ts`, `zuschlaege.ts`, `speicher.ts`, `plausi.ts` | 3 | FWS-Modus |
| `huelle.ts`, `raumweise.ts`, `klima.ts` | 4 | raumweise SIA 384/2 + Hüllen-Kaskade |
| `waermeabgabe.ts` | 5 | Heizkörper-Modul |
| `berechne.ts`, `relevanz.ts` | 6 | Orchestrierung, Relevanz |
| `zusatz/` | 11 | Förderung, Bewilligung, Offerte |
