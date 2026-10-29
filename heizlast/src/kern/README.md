# src/kern — Rechenkern

Reine TypeScript-Funktionen, kein DOM, kein Dateisystem, kein Import aus `src/ui` oder `src/bericht` (eslint erzwingt das). Daten kommen als Parameter (`fwsDaten()`, `hydraulikDaten()` aus `src/daten/fws.ts`; `huelleDaten()`, `siaDaten()`, `klimaDaten()` aus `src/daten/huelle.ts`, `sia384.ts`, `klima.ts`), nie per Datei-Lesen im Kern.

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
| `klima.ts` | 4 | Standort → SIA-2028-Station (PLZ/Kanton), θe mit Höhenkorrektur, Jahresmittel, HGT; Override mit Herkunft |
| `huelle.ts` | 4 | Bauteiltypen auf Gebäudeebene: Stufen-Picker, EINE Schichtkette (Epochen-Default Bestand → bekannte Stufen → ISO 6946 → Clamp), Sanierung ab Jahr, Override, Fenster/Türen/Innenbauteile |
| `raumweise.ts` | 4 | Räume und Bauteile (Referenz auf Hüllentyp + Fläche + Anschluss), Φ_T mit ΔU_WB/b_u/U_equiv, Φ_V = V·n_min·0.34, Σ Räume und saldierte Gebäude-Heizlast, EBF aus Räumen, nicht erfasster Rest |
| `waermeabgabe.ts` | 5 | Heizkörper-Modul: Q_N je Heizfläche (Typenschild/Modell/Bauart+Massen/alte Heizkurve), n aus einer Tabelle, Minderungen, Raum-Deckung, θ_VL,req (Bisektion), Gebäude-Auslegungs-VL + Ampel, Massnahmen |
| `berechne.ts`, `relevanz.ts`, `geraet.ts` | 6 | Orchestrierung (einziger Rechenpfad), Relevanz bedingter Felder, WP-Gerätefilter/Dimensionierung/Bivalenz |
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

## Kern-API Session 4

### `klima.ts`

```ts
klimaStandort({ plz?, kanton?, hoeheM?, stationOverride?, thetaEOverrideC?, thetaMittelOverrideC? }, klimaDaten()) → KlimaErgebnis
```

`KlimaErgebnis`: `station`, `stationsStufe` (`override|plz3|plz2|kanton`), `thetaE` (massgebend; `tabelle` ohne Korrektur, `berechnet` mit Höhenkorrektur, `override` manuell), `thetaEStation`, `hoehenkorrektur` [K] (`schaetzung`: 0.6 K/100 m ab |Δh| ≥ 200 m, gerundet, max ±6 K), `thetaMittelJahr` (Stationswert SIA 381/2 oder Höhenregression 11.5 − 0.5 K/100 m, ±1 K), `hgt`, `bezeichnung` («θe −8 °C, Station Zürich-Kloten (SIA 2028)»), `annahmen[]`, `hinweise[]` (`klima.keineStation` fehler, `klima.stationAusKanton`, `klima.hoehenkorrektur`, `klima.hoehenkorrekturBegrenzt`, `klima.hoeheFehlt`, `klima.overrideAbweichung`). Temperaturen tragen ein `band` [min, max] statt ±%. Hilfen: `findeStation`, `hoehenkorrekturK`, `jahresmittel`, `stationenListe`, `thetaEEingabe` (Fixtures).

### `huelle.ts`

```ts
huelleAufloesen({ baujahr, bauteiltypen: Bauteiltyp[], bezugsjahr?, zustand?: 'ist'|'geplant' }, huelleDaten()) → HuelleErgebnis
aufloesenBauteiltyp(typ, { baujahr, bezugsjahr?, zustand? }, daten) → BauteilU
standardBauteiltypen({ dachform?, dachraumBeheizt?, keller? }) → Bauteiltyp[]      // aw, dach|decke, boden, fenster, tuer, iw, id, it
stufenDefinition(art, baujahr, stufen, daten) → StufenDefinition[]                  // Optionen + sichtbarer Standardwert je Stufe (UI)
```

- `Bauteiltyp { id, art, bezeichnung?, stufen?, sanierung?, uOverride? }`; Arten: `aussenwand | dachSteil | dachFlach | deckeEstrich | bodenKeller | bodenErdreich | fenster | tuer | innenwand | innendecke | innentuer`.
- `Stufen { bauweise?, dickeM?, daemmung?, daemmstoff?, daemmdickeM?, generation?, rahmen?, typ? }` — alles optional; unbekannte Stufen bleiben beim Epochen-Default und sind in `stufenStandard[]` aufgeführt. `dickeM` ist bei Zweischalenmauerwerk die Gesamtdicke ohne Putz (Innenschale = Gesamt − Aussenschale − Zwischenraum).
- Kette: Epochen-Default **Bestand** → Bauweise (Epochen-Default mit dieser Bauweise, sonst Schichtvorlage `bauweisen[].schichten`, sonst Pauschal-U) → Dicke ersetzt die Tragschicht → Dämmung ja/nein (nein: Kerndämmung → Luftschicht; ja ohne Default: Dämmdicke der nächsten gedämmten Epoche = geringste typische Dicke) → Dämmstoff/Dämmdicke ersetzen die Dämmschicht → U = 1/(Rsi + ΣR + Rse) (Rsi nach Richtung, Rse: aussen 0.04, Erdreich 0, hinterlüftet/unbeheizt = Rsi) → **Clamp** in die Epochen-Spanne nur, solange die Dämm-Stufe geschätzt ist (Hinweis `huelle.clamp`); mit bekannter Dämmung gewinnt die Schichtrechnung (`huelle.ausserhalbSpanne` als Info).
- Sanierung `{ status: 'ausgefuehrt'|'geplant', jahr?, stufen?, uOverride? }`: Stufen der Sanierung ersetzen ihre Schicht; ohne Angabe gilt der Dämm-/Fenster-/Tür-Default der Sanierungs-Epoche (als Standard markiert); Clamp-Spanne = Sanierungs-Epoche; `uUnsaniert` bleibt erhalten; geplante Sanierungen wirken nur mit `zustand: 'geplant'` (`uNachSanierung` informativ).
- Herkunft: alles geschätzt → `fallback`/`epoche` mit Epochen-Unsicherheit (halbe Spanne / U, max. 100 %); Stufen bekannt → `schaetzung` (Dämmung ja/nein bekannt ±30 %, Dämmdicke bekannt ±20 %, alle Stufen ±10 %); Fenster/Tür-Tabellen `tabelle` (Generation ±10 %, + Rahmen ±5 %; Türtyp ±10 %); `override`. Begründung im Klartext: «geschätzt aus Baujahr 1965 (1961–1977): Aussenwand … Backstein 30 cm, ungedämmt — … → U 1.26 W/m²K; bekannt: Bauweise, Dicke, ±10 %».
- Bodenplatte gegen Erdreich: U ohne Erdreich-Korrektur (Rse 0); U_equiv rechnet `raumweise.ts`. Innenbauteile: Rsi beidseitig, Bauweise wählbar (Backstein 12/15, Beton 20, Ständerwand, Holz; Betondecke, Holzbalkendecke; Innentür 2.0).

### `raumweise.ts`

```ts
heizlastRaumweise(e: RaumweiseEingabe, { sia: siaDaten(), fws: fwsDaten() }) → RaumweiseErgebnis
```

- `RaumweiseEingabe`: `thetaE` (aus klima.ts), `thetaMittelJahr?`, `huelle` (HuelleErgebnis), `baujahr`, `gebaeudetyp?`, `lueftung? { konzept: natuerlich|wrg|lufterwaermung|abluftDauer, dichtheit: neubau|altbau, fensterErsetzt? }`, `waermebruecken? { key: bestand|neubau|nachweis | deltaU }`, `erdreich? { bodenflaecheM2, umfangM | bStrichM, grundwasserNah?, wandDickeM?, boden? }`, `geschosshoeheM?`, `raeume[]`, `ebf? { modus: raeume|manuell, manuellM2?, faktorNwfZuEbf? }`, `rest?`.
- `RaumEingabe { id, name, geschoss?, typ (sia384-2 Raumtypen), flaecheM2 | laengeM×breiteM, hoeheM?, thetaIntC?, nMinOverride?, zuluft?, aussenbezug?, beheizt?, inEbf?, bauteile[] }`; `RaumBauteilEingabe { typId? (Hülle vererbt U) | art, flaecheM2, anschluss, uOverride? }`.
- `Anschluss`: `aussen` (f 1) · `unbeheizt { situation keller|dachraum|garage|treppenhaus|nebenraum | nd3 {lage, flaechen, dicht} | bU | thetaNachbarC }` (Tabelle ND.3) · `erdreich { tiefeM? }` (Böden: U_equiv nach ISO 13370 mit B' = A/(0.5·P), f = f_g1 1.45 · f_g2 (θint − θm,e)/(θint − θe) · f_GW; Wände: < 2 m wie aussen, > 2 m wie unbeheizt) · `beheizt { thetaNachbarC?, andereEinheit? }` (f = (θint − θnb)/(θint − θe); zählt nur bei anderer Nutzungseinheit zur Hülle) · `faktor { f }`.
- Φ_T,k = (U + ΔU_WB)·A·f·(θint − θe) (ΔU_WB nur auf Hüllbauteile), Φ_V = V·n_min·0.34·(θint − θe) mit n_min aus Tabelle NA.7 (Raumtyp × Konzept × Dichtheit; «Raum ohne Aussenbezug» = ohne Fenster/Aussentür/Aussenwand). Kein n50-Term, kein Wiederaufheizzuschlag.
- Ergebnis: je Raum `phiT`, `phiV`, `phiHL` (Σ Räume, Heizflächen; negativ bei Innengewinnen), `phiHuelle` (Anteil saldiert); Gebäude `summeRaeume`, `saldiertRaeume` (nur Hülle + Lüftung), `rest`, `gebaeude` (= saldiert + Rest, massgebend), `summeMitRest`, `ebf` (Σ Nettoflächen × 1.10, Band 1.10–1.15, oder manuell), `spezifisch`, `innentransmissionAnteil`, `annahmen[]`, `hinweise[]`, `vollstaendig`, `methode` (Berichtstext).
- Rest (nicht raumweise erfasst): `{ modus: 'huellflaechen', aAussenwandM2, aFensterM2, aDachM2|aDeckeEstrichM2, aBodenM2, bodenAnschluss, volumenM3|flaecheM2 }` mit Hüllen-U, b_u, ΔU_WB, Lüftung wie Wohnraum — oder `{ modus: 'spezifisch', flaecheM2?, phiSpezWm2? }` mit Φ' = Bandmitte Folie 37 (grobe Schätzung, Hinweis). Kein «1 m² Wand pro m² EBF».

## Tests

`tests/kern/*.test.ts` — Sollwerte ausschliesslich extern: Kurslösungen A1/1B/2/3/4, Folien 31/32/43/45/48/49/52/54, BEISPIELRECHNUNG, Wissensbasis K §5, Handrechnungen (im Test dokumentiert). Eine bekannte Abweichung: die Kurslösungen verketten WW-Verluste multiplikativ (1.1·1.15·1.15), der Kern rechnet additiv (Folie 49/SIA 385/2) — Q_hl und Q_h bleiben innerhalb ±1 %, Q_w weicht bis 3 % ab (dokumentiert in `fws.test.ts`).

Session 4 (`klima.test.ts`, `huelle.test.ts`, `raumweise.test.ts`): SIA-2028-Stationswerte, ISO-6946-Handrechnungen, Referenzhaus 238/5 (Räume ±2 %, Flur echt gerechnet: −106 W gegenüber −95 W, Formblatt rundet f_RT), IBO-Musterhaus (Lüftung 14 Räume, Erdreich: ISO-Formel +17 % gegenüber DIN-Tabelle auf 4 % der Last), eigenes CH-EFH von Hand, U_equiv-Tabelle ±8 %; Property-Tests: Bestätigen der Defaults ändert nichts, epochentypische Bauweise bleibt in der Spanne, Dämmung↑ ⇒ U↓, Dicke↑ ⇒ U↓, jüngere Fenster ⇒ U↓, Saldierung ≤ Σ Räume, Hülle → Raum, Override gewinnt.

## Kern-API Session 5

### `waermeabgabe.ts`

```ts
waermeabgabe(e: WaermeabgabeEingabe, { hk: heizkoerperDaten(), fws: fwsDaten(), sia: siaDaten() }): WaermeabgabeErgebnis
```

`WaermeabgabeEingabe`: `heizkreise[] { id, bezeichnung?, tVLC?, spreizungK?, gemischt? }` (IDs intern, nicht editierbar), `raeume[] { id, name, typ?, thetaIntC? | thetaInt (Wert), flaecheM2?, phiHL (Wert aus raumweise) | phiHLManuellW?, beheizt?, ausklammern?, ausklammernGrund?, heizflaechen[] }`, `zielVLC?` (Standard 55 °C), `verteilung? { qhl: Wert, ebfM2? }` (FWS-Modus ohne raumweise Heizlast), `heizkurveAlt? { tVLC, tRLC? }`, `auslegungsVLOverrideC?`.

Heizfläche `{ id, bauart, kreisId?, bezeichnung?, hoeheMm?, laengeMm?, tiefeMm?, nabenabstandMm?, glieder?, gliedbreiteMm?, einbau?, designTyp?, flaecheM2?, verlegeabstandMm?, belag?, rlb?, system?, modellId?, typenschild? { qNW, tVLC, tRLC, tRaumC, n? }, minderungen? { nische?, verkleidung?, oberflaeche?, anschluss? }, nOverride? }`. Bauarten: `BAUARTEN` (Platte 10–33, Guss-/Stahlglieder, Röhren 2–6, Konvektor passiv/Gebläse, Bad, Vertikal, FBH, Wand). `relevanteMasse(bauart)` sagt, welche Felder gelten (UI-Relevanz); fremde Felder ignoriert der Kern. `heizflaecheBauartWechseln(hf, neu)` setzt Masse zurück (Platte ↔ Platte behält Höhe/Länge = gleiche Nische).

- Q_N (75/65/20; Flächenheizung 35/28/20): Typenschild ±2 % (Umrechnung über Δθ_log, 90/70 → 0.795) > Modell-DB ±5 % > Tabelle nach Massen ±15 % (Platten W/m × Länge, interpoliert über Höhe; Glieder W/Glied nach Bauhöhe bzw. Nabenabstand × Tiefe, gemessene Höhe rastet ±30 mm auf DIN-Stufe ein; Röhren W/Glied je Säulen × Höhe; Konvektor W/m nach Höhe × Tiefe, verkleidet oder Unterflur; Bad/Vertikal nach Höhe × Breite; FBH q(ΔθH 15 K) nach VA × Rλ,B, Oberflächengrenze 100 W/m²; Wand 80 W/m² bzw. WEM-Systeme) > alte Heizkurve (Mindest-Q_N, ±30 %). Extrapolation ±25 %, Standardwert-Masse (Guss-Tiefe 160 mm, FBH VA 150/Rλ,B 0.10, Konvektor verkleidet, Vertikal Typ 22) ±25 %, quadratisch kombiniert.
- n aus `exponenten.werte` (eine Tabelle); Modell/Typenschild/Override gewinnen.
- f_m = f1·f2·f3·f4·f5 (Nische, Verkleidung je Bauart, Oberfläche; f4/f5 nur bei Anschluss «reitend»), ohne Angaben 1.
- Raum: Q je Heizfläche bei Kreis-VL bzw. Ziel-VL und Kreis-Spreizung (Standard 10 K Radiatoren, 7 K Flächen), Deckung = Σ Q / Φ_HL (grün ≥ 1.0, gelb ≥ 0.85, rot), θ_VL,req per Bisektion über Σ Q(θ) (gemischte Kreise gedeckelt), Suchbereich bis 90 °C (darüber: nicht erreichbar).
- Massnahmen bei Deckung < 1: Typ-Upgrade gleiche Nische (alle stärkeren Plattentypen mit neuer θ_VL,req), nötige Länge bzw. Gliederzahl bei Ziel-VL (Platte zusätzlich als Typ 33), FBH-Fläche bei 35/28, Gebläsekonvektor-Q_N für die fehlende Leistung, Vorlauf halten (Hybrid).
- Gebäude: `auslegungsVL` = max θ_VL,req der beheizten, nicht ausgeklammerten Räume (unerreichbar → 90 °C, rot); ohne Bewertung höchster Kreis-VL; Override gewinnt mit Hinweis (Warnung, wenn tiefer als der Bedarf). Ampel ≤ 55 gut / ≤ 65 kritisch / > 65 ungeeignet mit Klartext-`urteil`, `kritischeRaeume` (Top 3), `massgebenderRaum`.
- FWS-Modus: Φ_HL,Raum = Q_hl / EBF × 1.10 × A_Raum (bzw. Anteil der erfassten Raumflächen), Schätzung ±25 %.

Hilfsfunktionen: `dTlog`, `leistungsfaktor`, `bisektionVorlauf`, `vorlaufNaeherungArithmetisch` (nur Vergleich), `normleistung`, `minderungsfaktor`, `ampelVorlauf`, `interpoliere1/2`, `kategorieVon`, `bauartDaten`.

## Kern-API Session 6

### `berechne.ts` — der einzige Rechenpfad

```ts
berechne(state: State, daten: Datensatz /* alleDaten() aus src/daten/index.ts */): Ergebnis
```

Ablauf: Klima → EBF (`ebfBestimmen`, manuell oder Σ Raumflächen × 1.10, eine Quelle für beide Modi) → Heizlast (FWS bzw. raumweise; die andere Methode nur als **Gegenprobe**, wenn ihre Daten echt vorhanden sind: Rechnungen bzw. Räume mit Bauteilen) → Plausi → WW künftig → WW-Speicher → Zuschläge → Wärmeabgabe → Gerät → Puffer → MAG/SV → Annahmen, Hinweise, Vollständigkeit, Status.

`Ergebnis`: `heizlast { massgebend { wert, quelle 'fws'|'raumweise', art, status 'gemessen'|'raumweise'|'schaetzung'|'fehlt', label }, fws, raumweise, huelle, gegenprobe, spezifisch }`, `ebf`, `klima`, `plausi.spezifisch`, `warmwasser { bisher (nur Abzug), kuenftig, zuschlag }`, `zuschlaege { qhl, qw, qoff, qas, sperrzeit, qh }`, `waermeabgabe`, **`auslegungsVL`** (die eine VL: aus Heizflächen, Override, sonst Standardwert 55 °C als Annahme), `geraet`, `speicher { ww, puffer, pufferEffektiv, mag, sicherheitsventil }`, `annahmen[] { wert, schritt }`, `hinweise[] (Hinweis + schritt)`, `vollstaendigkeit[] { schritt, pfad, text }`, `relevanteSchritte`, `status` je Schritt (`offen` > `warnung` > `annahmen` > `vollstaendig`).

Regeln: Sanierungen sind EINE Liste — FWS wertet Massnahme/Einsparung/Datum aus (§3a), raumweise setzt die Bauteiltypen der passenden Art (`fws.json sanierungen.massnahmen[].bauteile`, «dach» = Steil-/Flachdach/Estrichdecke) bzw. `bauteiltypIds` auf «saniert ab Jahr» (späteste wirksame gewinnt); mit geplanten Massnahmen rechnet raumweise im Zustand «geplant» (wie FWS `qhlKorr`). WW bisher (Abzug) und WW künftig sind getrennte Äste ohne stille Kopplung (UX-11/13). Puffer abgewählt → effektiv 0 l; Overrides wirken in Dashboard, MAG und Bericht (FLOW-07). Heizflächenart für Puffer/MAG wird aus den erfassten Heizflächen abgeleitet.

### `relevanz.ts`

`relevant(pfad, state, daten?)` — hierarchische Regeltabelle `RELEVANZ_REGELN` (Muster mit `*` für Listen-ids, Klartext `wenn`); mit `daten.hk` auch Heizflächen-Masse je Bauart (`relevanteMasse`). `schrittRelevant(id, state)`, `schrittVonPfad(pfad, state)`, `ruhendeAngaben(state)` (Hinweis beim Moduswechsel), `SCHRITT_IDS`, `SchrittStatus`, `heizflaechenVorhanden`.

### `geraet.ts`

`geraetWaehlen({ qh, auslegungsVL, wwLadetemperaturC?, filter { quelle, toleranzUntenProzent?, aufstellung?, schallNachtMaxDb?, vorlaufC? }, auswahlId? }, { fws, wp })` → `{ filterVorlauf, qWpMin, qWpMax, liste[] (sortiert nach |Q_WP − Q_h|, Ampel je Gerät), gewaehlt { qWp, vorlaufMax, mindestPuffer, dimensionierung, bivalenz }, annahmen, hinweise }`. `dimensionierung(qhW, qWpW, fws)`: r = Q_h/Q_WP, grün 0.75 ≤ r ≤ 1 (Kurs-Faustregel), gelb 0.60–0.75 bzw. 1.00–1.10, sonst rot (Bänder Thermowerk-Annahme, fws.json `geraetewahl`). `bivalenz(qhW, qWpW, fws)`: Folie-95-Tabelle, zwischen 50 % und 100 % gegen monovalent interpoliert (Schätzung), unter 25 % nicht abschätzbar.

### `raumweise.ts` (Ergänzung)

`ebfBestimmen({ modus, manuellM2?, faktorNwfZuEbf? }, summeFlaecheRaeume, fws)` und `flaecheAus(raum)` sind exportiert (gemeinsam mit `berechne`).
