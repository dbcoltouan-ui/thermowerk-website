# src/kern — Rechenkern

Reine TypeScript-Funktionen, kein DOM, kein Dateisystem, kein Import aus `src/ui` oder `src/bericht` (eslint erzwingt das). Daten kommen als Parameter (`fwsDaten()`, `hydraulikDaten()` aus `src/daten/fws.ts`), nie per Datei-Lesen im Kern.

Einziger Rechenpfad ab Session 6: `berechne(state, daten) → Ergebnis`. Jeder berechnete oder ergänzte Wert ist ein `Wert` mit Herkunft (siehe `wert.ts`).

| Modul | Session | Inhalt |
|---|---|---|
| `wert.ts` | 1/3 | Herkunftsmodell: `Wert { wert, einheit, herkunft, stufe?, unsicherheit?, band?, begruendung, quelle? }`, Konstruktoren `eingabe/messung/tabelle/schaetzung/fallback/override/berechnet`, `istAnnahme`, `sammleAnnahmen`, Unsicherheits-Fortpflanzung, `Hinweis { stufe, code, text, pfad? }`, `fmt` |
| `typen.ts` | 3 | `Ampel`, `Energietraeger`, `Konvention`, `Gebaeudetyp`, `WpQuelle` |
| `fws.ts` | 3 | FWS-Verbrauchsmethode: Jahresraster, Konvention, WW-Abzug, Sanierungen §3a, Methoden B/C/Bauperiode, t_voll |
| `warmwasser.ts` | 3 | Warmwasserbedarf (Personen / SIA-385/2-Belegung / direkt / Messung), additive Verluste, Speicherverlust aus Volumen, Ladezeit-Zuschlag |
| `zuschlaege.ts` | 3 | Sperrzeit-Zuschlag, Zusatzleistung, Q_h = Q_hl + Q_w + Q_off + Q_as |
| `speicher.ts` | 3 | WW-Speicher (ΔT = T_Lade − 10, f_sto, Spitzendeckung, Marktrundung), Heizungspuffer (max-Regel), MAG, Sicherheitsventil |
| `plausi.ts` | 3 | Spez. Heizleistung gegen Bauperioden-/Minergie-Band, Vergleich Norm ↔ Verbrauch |
| `huelle.ts`, `raumweise.ts`, `klima.ts` | 4 | raumweise SIA 384/2 + Hüllen-Kaskade |
| `waermeabgabe.ts` | 5 | Heizkörper-Modul |
| `berechne.ts`, `relevanz.ts` | 6 | Orchestrierung, Relevanz |
| `zusatz/` | 11 | Förderung, Bewilligung, Offerte |

## Konventionen

- **Einheiten intern:** Leistung W, Energie kWh/a bzw. kWh/d, Temperatur °C, Differenz K, Volumen l, Zeit h bzw. Tage, Fläche m². Formatierung (kW, Tausender-Apostroph) nur in der UI/im Bericht (`fmt` liefert Schweizer Schreibweise für Begründungstexte).
- **Herkunft `berechnet`** (Session 3): Wert aus einer Formel über andere Werte; er ist selbst keine Annahme — seine nicht eingegebenen Eingangswerte (η-Preset, t_voll-Tabelle, Heizwert, Standardwerte) landen in `annahmen[]`. Die `begruendung` enthält die Formel mit eingesetzten Zahlen (Rechenweg für den Bericht).
- **Standardwerte** sind `fallback` mit `stufe: 'standardwert'` (UI zeigt sie als Zahl mit Markierung «Standardwert», Daniel 29.10.).
- Jede Funktion ist total: fehlende Pflichtangaben erzeugen `Hinweis { stufe: 'fehler' }` und `null`-Ergebnisse statt Exceptions.

## Kern-API Session 3

### `fws.ts`

```ts
heizlastFws(e: FwsEingabe, daten: FwsDaten): FwsErgebnis
```

`FwsEingabe`: `methode: 'verbrauch' | 'wpBetriebsstunden' | 'messung' | 'bauperiode'` (explizit, keine «erste aktive gewinnt»), `tvoll { bedarfsart?, hoeheM?, override? }`, `verbrauch? { eintraege[], eta, konvention, wwAbzug?, klimabereinigung? }`, `wpBetriebsstunden?`, `messung?`, `bauperiode?`, `sanierungen?`, `heute?`.

- Eintrag des Jahresrasters: `{ energietraeger, menge, jahr }` (= 365 Tage) oder `{ …, von, bis }` (ISO, beide inklusiv; Lieferungen als «Tank voll bis Tank voll»). Jahresmenge je Träger = Σ Menge · 365 / Σ Tage; Summe nur über verschiedene Träger. Überlappung desselben Trägers → `fehler`, `qhl = null`.
- Streuung: grösste Abweichung der annualisierten Einträge (≥ 300 Tage) vom Mittel; ≥ 10 % gelb, ≥ 20 % rot (fws.json `verbrauch.streuung`, Thermowerk-Annahme).
- Konvention `fwsKurs` (Ho 10.5/10.4, Kurs-η, Default) oder `hi` (BFE 10.0/10.08; Presets werden mit Ho/Hi umgerechnet, eigener η gilt als Hi-bezogen).
- `wwAbzug.qnWwKwhA` (aus `warmwasserBedarf` mit den **bisherigen** WW-Angaben) wird nur übergeben, wenn «WW bisher über die Heizung»; Zuordnung zum Träger mit grösstem Anteil oder `traeger`.
- Sanierungen: `{ massnahme: 'fenster'|'fassade'|'estrich'|'kellerdecke'|'individuell', einsparungProzent?, status: 'ausgefuehrt'|'geplant', datum? }`. Ausgeführte Massnahmen werden je Zeitraum nach FWS-RECHENWEGE §3a gewichtet (`subperiodenKorrektur`: W_pre = W·L/Σ(L_j·F_j), W_ist = W_pre·F_heute); geplante wirken multiplikativ auf `qhlKorr`.
- Ergebnis: `qhlUnsaniert` (vor allen Massnahmen; Plausi-Band), `qhlIst` (ausgeführte), `qhlKorr` (= `qhl`, massgebend), `traeger[]` mit Rechenweg je Energieträger, `sanierungen`, `streuung`, `wp` (Methode B: h/a, Q_k, Entzugsleistung), `annahmen[]`, `hinweise[]`, `vollstaendig`.
- Klimabereinigung (HGT_norm/HGT_ist je Eintrag) nur auf Wunsch, Default aus, als «nicht FWS-Kurs» markiert.

Hilfsfunktionen: `volllaststunden`, `heizwert`, `jahresnutzungsgrad`, `sanierungsEinsparung`, `zeitraumVonEintrag`, `parseDatum`, `tageInklusiv`, `bauperiodeFuerBaujahr`, `bauperiodeBandWm2`, `betriebsstundenNeu`, `etaPresetsFuer`.

### `warmwasser.ts`

```ts
warmwasserBedarf(e: WarmwasserEingabe, daten): WarmwasserErgebnis   // vwu, qwu, verluste{speicher,leitungen,ausstoss}, qww [kWh/d], qnWw [kWh/a]
leistungszuschlagWarmwasser(qhl: Wert, qww: Wert, daten): { td, qw, hinweise }   // t_d = Q_WW/Q_hl, Q_w = Q_hl·(24/(24−t_d)−1); Warnung > 12 h, kein Clamp
personenbelegung(anfM2, daten)                       // SIA 385/2: 3.3 − 2/(1+(A/100)³)
speicherverlustAusVolumen(liter, daten)              // Folie 45, linear interpoliert
```

Verluste **additiv** auf Q_W,u (Folie 49). Zirkulation: `{ art: 'keine' | 'rohrAnRohr' | 'separat' (je laengeM?) | 'unbekannt' | 'warmhalteband' }`.

### `zuschlaege.ts`

`sperrzeitZuschlag(qhl, toffH, daten)` (0–8 h, > 8 Warnung, ≥ 24 Fehler) · `zusatzleistung(verbraucher[])` · `auslegungsleistung({ qhl, qw, qoff, qas })`.

### `speicher.ts`

`wwSpeicher({ qwwKwhTag, vwuLiterTag?, tLadeC?, fStoKey?, gebaeudetyp?, volumenOverrideLiter? }, daten)` · `puffer({ quelle, qWpW?, qhlW?, heizflaechen, einzelraumregelung, herstellerMinimumLiter?, sperrzeitUeberbrueckung?, sperrzeitH?, volumenOverrideLiter? }, daten)` · `mag({ anlagenvolumenLiter? | qhW + heizflaechen + pufferLiter + wwSpeicherImHeizkreisLiter, tVlMaxC?, p0Bar?, pSvBar? }, hydraulikDaten)` · `sicherheitsventil(abblaseleistungW, hydraulikDaten)` · `ausdehnungsfaktor(tVlMaxC, hydraulikDaten)` · `aufMarktstufe(liter, reihe, schritt)`.

### `plausi.ts`

`spezifischeHeizleistung({ qhlUnsaniertW, ebfM2, baujahr, gebaeudetyp, energiestandard?, saniert? }, daten)` → Ampel gegen Folie-37-Band (±15 % gelb) bzw. Minergie-P 8–12 W/m² · `vergleichNormVerbrauch(qhlNorm, qhlVerbrauch, daten)` → grün bei Norm 10–25 % über Verbrauch.

## Tests

`tests/kern/*.test.ts` — Sollwerte ausschliesslich extern: Kurslösungen A1/1B/2/3/4, Folien 31/32/43/45/48/49/52/54, BEISPIELRECHNUNG, Wissensbasis K §5, Handrechnungen (im Test dokumentiert). Eine bekannte Abweichung: die Kurslösungen verketten WW-Verluste multiplikativ (1.1·1.15·1.15), der Kern rechnet additiv (Folie 49/SIA 385/2) — Q_hl und Q_h bleiben innerhalb ±1 %, Q_w weicht bis 3 % ab (dokumentiert in `fws.test.ts`).
