# src/bericht — Bericht (Session 9)

Liest ausschliesslich das `Ergebnis` von `berechne()` (Zahlen, Rechenwege = Begründungen des Kerns, Annahmen); der State liefert nur Beschriftungen (Projekt, Adresse, Erfassungsart, Masse der Heizflächen). Vorschau in Schritt 10 und Druckvorlage sind dieselbe Komponente.

| Datei | Inhalt |
|---|---|
| `Bericht.tsx` | Kopf (Absender aus `data/firma.json`, Logo), Titel, `berichtKapitel(b)` — Kapitel nur, wenn ihr Inhalt vollständig vorliegt (Grundsatz Daniel 30.10.: keine Platzhalter, keine Verweise auf Fehlendes, keine JAZ) |
| `kapitelHeizlast.tsx` | Objekt (nur relevante Angaben mit Herkunft), Zusammenfassung (gleiche Formate wie das Dashboard, Methode wörtlich, θe mit Station), Rechenweg FWS (Zeitraum-Tabelle je Energieträger: Herleitung der Menge, HGT mit Herkunft, Jahresanteil, pro Jahr, Sanierungen; Klimabereinigung ausdrücklich «nicht FWS-Kurs») bzw. raumweise (U·A·b-Tabelle je Raum mit Grundlage «Standard aus Baujahr …» / eigener Typ / eigener U-Wert, Gebäude saldiert vs. Σ Räume) |
| `kapitelAnlage.tsx` | Warmwasser (nur wenn die WP Warmwasser bereitet), Zuschläge und Q_h, **Wärmeabgabe** (Fazit Auslegungs-VL + WP-Tauglichkeit + Skala, Tabelle Räume: Φ_HL, Σ Q bei Ziel-VL, Deckung, θ_VL,req, Beurteilung; Tabelle Heizflächen: Bauart, Masse mit Standardwerten «*», Herkunft Q_N, Q_N, Q bei Ziel-VL; Massnahmen), Speicher/MAG/SV, Wärmepumpe (Gerät aus der DB, Bivalenz, Modulation nur wenn erfasst) |
| `kapitelAnhang.tsx` | Plausibilität, Annahmen & Unsicherheiten (aus `Ergebnis.annahmen`, je Schritt, mit Herkunft, ± / Spanne, Quelle), Normen und Quellen (Titel aus `_meta.quellen` der Datendateien, nur verwendete) |
| `teile.tsx` | Kapitel, Wertetabelle, Rechenschritt, Herkunftsnotiz, Ampel-Marke, Tabelle; `berichtText()` entfernt Bedienhinweise («überschreibbar») |
| `pruefliste.ts` | Vollständigkeits-Check: offene Pflichtangaben/Fehler sperren den Druck, Warnungen übersteuerbar; fehlende Gerätewahl = Warnung |
| `export.ts` | Projekt als JSON (State v4, lädt über `hydrateState`), Dateinamen |
| `bericht.css` | Layout nach `referenz/alt-export/export.mjs` (BROSCH_CSS); Vorschau als Blatt (mobil fliessend), `@media print` nur der Bericht, A4 |

Tests: `tests/bericht/bericht.test.tsx` (Bericht = Dashboard aus demselben Ergebnis, Relevanz, Export), `e2e/bericht.spec.ts` (Druck-Smoke Desktop/Mobil mit PDF, JSON-Export/Laden).
