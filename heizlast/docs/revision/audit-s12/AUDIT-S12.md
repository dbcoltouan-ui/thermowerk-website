# Audit Session 12 — Gesamtbild (Abnahme des Neubaus)

Stand 2026-10-31. Vier unabhängige Prüfer (Fable, ohne Beteiligung am Code) haben die 198 IDs der Revision des alten Tools (`BEFUND.md`, Teilberichte `befund_*.md`) gegen den Neubau geprüft, dazu die Funktions-Checkliste, die Referenzrechnungen durch die Oberfläche, den Vergleich mit dem FWS-Rechner und die Mobil-Prüfung. Danach Fixes und ein zweiter Durchlauf. Teilberichte: `fachlogik.md`, `heizkoerper.md`, `ux-datenfluss.md`, `code-qualitaet.md`, `fws-vergleich.md`, `durchlauf2.md`.

## 1. Befund-Checkliste (198 IDs)

| Bereich | IDs | KRITISCH/HOCH behoben | n. z. | offen (1. Durchlauf) | MITTEL/NIEDRIG offen |
|---|---:|---:|---:|---|---|
| Fachlogik (FACH) | 41 | 12 | 0 | 0 | 1 NIEDRIG (FACH-52 teilweise: Gelb-Schwelle Deckung 0.85) |
| Heizkörper (HK) | 31 | 13 | 1 (HK-04) | 0 | 1 NIEDRIG (HK-28 abgewandelt: rohe Schlüssel in Begründungen) |
| UX / Datenfluss (UX, FLOW) | 63 | 24 | 0 | 0 | 1 NIEDRIG (UX-47 abgewandelt: Schema-Felder ohne UI) |
| Code / Daten / Build / Backend | 63 | 18 | 2 (CODE-11, CODE-17) | **1 → behoben S12** (DATA-04 Rest: Schallfilter) | 3 gering (CODE-28 Schrittnummern, BUILD-13 CLAUDE.md → S12, CODE-07 Funktionslänge) |
| **Summe** | **198** | **67** | **3** | **0 nach Fixes** | — |

«Nicht zutreffend» = der kritisierte Mechanismus existiert im Neubau nicht mehr (z. B. CODE-11 toter Resolver-Pfad, CODE-17 Copy-Paste-Zweig, HK-04 Pauschale 1000 W/m²). Belege (Test oder Probe) stehen je ID in den Teilberichten; die Proben liegen unter `tests/audit-s12/` und laufen in `npm test` mit.

## 2. Neue Befunde im Neubau und ihr Stand

| Nr. | Schwere | Befund | Stand |
|---|---|---|---|
| C1 | HOCH (DATA-04 Rest) | Schallfilter lässt Geräte ohne Schallwert still passieren | **behoben**: Markierung «Schall unbekannt» + Hinweis, Test `geraet.test.ts` |
| U1 | MITTEL | Heizgradtage (Tabelle, Normjahr) fehlen in `annahmen[]` | **behoben**: je Zeitraum HGT_ist/HGT_ref, mit Klimabereinigung HGT_norm (`fws.ts`, Tests `verbrauchsreihe.test.ts`) |
| U2 | MITTEL | U-Overrides je Raum-Bauteil fehlen in `annahmen[]` | **behoben** (`raumweise.ts`, Test + Snapshot 27 → 36) |
| U3 | MITTEL | Schema-Felder ohne UI, die der Kern liest (`nMinOverride`, `beheizt`, `inEbf`, `zuluft`, `thetaMittelOverrideC`, `waermebruecken.deltaU`, Erdreich B′/Wanddicke, WW «belegung», `speicherVolumenLiter`, Methode-B von/bis, `projekt.notiz`) | **offen, Entscheid Daniel**: Felder in der UI anbieten oder aus dem Schema streichen. Heute nur über JSON-Import setzbar; gesetzte Overrides erscheinen als Annahme (nMin, θ_Jahresmittel), `beheizt:false` schliesst den Raum sichtbar aus. Kein Go-Live-Blocker. |
| K1 | MITTEL | Produktions-Build hängt an den Typen der Playwright-Specs | **behoben**: `tsconfig.build.json` (src/data), `lint` prüft weiter alles |
| F1 | MITTEL | Bedarfsart «Raumwärme + Warmwasser» (t_voll 2 300) kombinierbar mit WW-Abzug/Q_w ohne Hinweis | **behoben**: Warnung `tvoll.wwDoppelt` am Feld (`berechne.ts`, Test) |
| F2 | MITTEL | Rest «spezifisch»: Φ′-Schätzung nicht in `annahmen[]` | **behoben** (`RestErgebnis.phiSpez`, Test) |
| H1 | MITTEL | Gedeckelter Mischerkreis ohne Deckung → Gebäude «≥ 90 °C», Gerätefilter leer, FBH-Massnahme für FBH-Raum | **behoben**: `mischerGrenze` je Raum mit Hinweis, θ_VL,req ohne Deckel, FBH-Massnahme nur ohne Flächenheizung, eigene Texte für zu kleine Flächenheizung (Probe `tests/audit-s12/heizkoerper/rechenkette.test.ts`) |
| S4 | MITTEL (im FWS-Vergleich gefunden) | Schritt 4 nannte bei aktiver Klimabereinigung nicht, dass der Rechenweg klimabereinigt ist | **behoben** (`Heizlast.tsx`, e2e «FWS-Rechner-Vergleich Öl») |
| — | NIEDRIG (27) | Siehe §3 der Teilberichte (rohe Schlüssel in Begründungen, Konstanten im Kern, UI-Standardwert-Objekte, EBF-Default raumweise, Schrittnummern in Texten, Steildach-Default 1961–77, Epochensprung 1945/46, Strom×COP verlangt Zähler, Sanierungs-Stufen ohne UI, Spreizung 10 K als Fachentscheid, Typenschild nur 20 °C, Bad-HK-Massnahme, README-Zahlen, OE-0001 in Fixtures, …) | offen, dokumentiert; Fachentscheide (Spreizung 10 K, Klimabezug «Mittel 2016 ff.») für Daniel |

## 3. Funktions-Checkliste des alten Tools (im Umfang)

| Funktion | Neubau | Beleg |
|---|---|---|
| Projekte lokal (Entwurf, Liste, Autosave, Rückfrage bei «Neu»/Laden) | ja | `tests/state/persistenz.test.ts`, `e2e/persistenz.spec.ts`, `e2e/bericht.spec.ts` (JSON laden) |
| Projekte Cloud (Anmeldung, Liste, Konflikt, Drift, Löschen, Offline-Status) | ja | `tests/backend/*` (48), `tests/state/cloud.test.ts`, `e2e/cloud.spec.ts` (zwei Browser), `e2e/cloud-staging.spec.ts`; curl gegen Staging (Audit Code BUILD-06/07) |
| Export (PDF über Druck, JSON-Datei, Laden aus Datei) | ja | `e2e/bericht.spec.ts` (PDF A4 ≥ 3 Seiten, JSON → Laden gleiches Q_h), `tests/bericht/bericht.test.tsx` |
| WP-Auswahl (Filter Leistung/Vorlauf/Aufstellung/Schall, Dimensionierungs-Ampel, Bivalenz, Modulation) | ja | `tests/kern/geraet.test.ts` (17), `e2e/waermeabgabe.spec.ts` (Gerätefilter übernimmt Auslegungs-VL) |
| Mobile (390 px alle Schritte, Popover im Viewport, Schrittleiste) | ja | `e2e/mobil.spec.ts` (3 Tests: Popover ⓘ/Chip/Legende im Viewport, Schrittleiste, alle Schritte beider Modi ohne horizontales Scrollen); gesamte e2e-Suite läuft zusätzlich im Projekt «mobil» (37 Tests) |
| Heizlast FWS (Rechnungen, Lieferungen/Tankstände, Zählerstände, WP-Zähler, Wärmezähler, Bauperiode) | ja | `tests/kern/fws.test.ts`, `verbrauchsreihe.test.ts`, `e2e/verbrauch.spec.ts`, `e2e/abnahme.spec.ts` |
| Heizlast raumweise (Hülle, Räume, Standardaufbauten, Rest) | ja | `tests/kern/raumweise.test.ts`, `huelle.test.ts`, `e2e/schritte.spec.ts`, `kette.spec.ts`, `abnahme.spec.ts` (238/5) |
| Heizkörper-Modul (Bauarten, Masse, Typenschild/Modell, θ_VL,req, Auslegungs-VL, Massnahmen) | ja (neu) | `tests/kern/waermeabgabe.test.ts`, `e2e/waermeabgabe.spec.ts`, `abnahme.spec.ts` (B1/B3) |
| Warmwasser, Zuschläge, Speicher/Puffer/MAG | ja | `tests/kern/warmwasser.test.ts`, `zuschlaege.test.ts`, `speicher.test.ts`, `e2e/waermeabgabe.spec.ts` |
| Förderung, Bewilligung, Offerte, Hydraulik-Schemas, Import alter Projekte, JAZ | **nicht im Umfang** (Entscheid Daniel 29./30.10.) | — |

## 4. Referenzrechnungen durch die Oberfläche (`e2e/abnahme.spec.ts`, Desktop 1280 + Mobil 390, 16 Läufe grün)

Sollwerte ausschliesslich extern (Kurslösungen FWS M3, Befund §5, Formblätter 238/5): Kurs 1A 12.5/1.14/13.64 kW; Kurs 2 12.55/1.79/0.51/14.85 → mit Massnahmen 8.83/10.58 kW; Kurs 3 11.5/5.64/17.14 kW; Kurs 4 8.4/0.6/9.0 kW (Methode B, nicht die WP-Nennleistung); HK B1 Typ 22 600×1000 @55/45 im Band 842–873 W, B3 θ_VL,req T21 ≈ 81 / T22 ≈ 72 / T33 ≈ 61 °C (±2 K); Referenzhaus 238/5 aus Datei geladen: vier Räume ±2 %, Flur −106 W (Formblatt −95, dokumentiert), Σ Räume 4 466 W (±1 % zu 4 447), saldiert 4 289 W ≤ Σ; Gas mit Zählerständen 2 500/2 400/2 600 m³ → Mittel 2 498 m³/a, Q_hl 11.95 kW; Öl mit Tankständen 3 800 l / 248 d → 3 865 l/a, Q_hl 17.25 kW (Klimabereinigung 21.6 kW). Jeder Lauf endet im Bericht (Schritt 10) mit denselben Zahlen wie Dashboard und Schritt 4/6/7.

## 5. Vergleich mit dem FWS-Rechner

Siehe `fws-vergleich.md`: Öl +4.5 %, Gas +1.3 % (inkl. WW) gegenüber burner-replacement.suissetec.ch; alle Abweichungen auf Heizwert-Konvention (Hi vs. Ho, ±6 %), Volllaststunden je Station (Bern 2 150 vs. Kurs 2 000, +300 mit WW), Klimanormierung (Mittel 2016 ff. vs. Kurs/SIA 2028) und Warmwasser-Ansatz (2 W/m² vs. Folie 45/46) zurückgeführt — keine Rechenfehler.

## 6. Zweiter Durchlauf und Prüfläufe

Zweiter Durchlauf (`durchlauf2.md`, unabhängiger Prüfer): alle 8 Fix-Punkte **behoben**, keine offene KRITISCH/HOCH-ID; Sichtung von `abnahme.spec.ts` und der 238/5-Fixture bestätigt die externen Sollwerte (fünf NIEDRIG-Bemerkungen zu Toleranzen/Benennung umgesetzt: Kurs-2-Abzug gegen den Kurswert 4 309, Kurs 3 mit EBF 1 832 m² und Plausibilitäts-Pointe, B1 auf das Originalband, Flur-Toleranz und Schranke benannt, Öl-Vergleich als Regression gekennzeichnet). Zwei weitere NIEDRIG-Punkte danach behoben (Normjahr-Zeile nur einmal im Annahmen-Protokoll; Gebäude-Urteil nennt den nötigen Mischer-Anhub).

`npm test` 825/825 (Vitest, inkl. 185 Audit-Proben), `npm run lint` 0 Fehler, `npm run build` ok, Playwright lokal 74/74 (58 bestehend + 16 Abnahme, Desktop + Mobil), gegen das deployte Staging 66/66 (`e2e:staging`, Build 83b89d3).
