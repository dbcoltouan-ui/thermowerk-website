/**
 * Plausibilität (FWS M3 Folie 37, Aufgabe 2/3; Befund FACH-50/51) — reine Funktionen.
 *   spez = Q_hl,unsaniert / EBF  [W/m²]  gegen das Bauperioden-Band (unsanierte Gebäude), Toleranz ±15 % → gelb
 *   Minergie-P: 8–12 W/m² (Aufgabe 3 Lösung); Verbrauchsmethode dort zu ungenau
 *   Vergleich Norm (SIA 384/2, saldiert) ↔ Verbrauch: Erwartung «Norm 10–25 % über Verbrauch» = grün
 */
import type { FwsDaten } from '../daten/fws';
import { bauperiodeBandWm2 } from './fws';
import type { Ampel, Gebaeudetyp } from './typen';
import type { Hinweis, Wert } from './wert';
import { berechnet, fmt } from './wert';

export type Energiestandard = 'keiner' | 'minergie' | 'minergieP';

export interface SpezHeizleistungEingabe {
  /** Heizlast VOR Sanierungen [W] (fws.ts qhlUnsaniert) — das Band gilt für unsanierte Gebäude. */
  qhlUnsaniertW: Wert;
  ebfM2: Wert;
  baujahr: number;
  gebaeudetyp: Gebaeudetyp;
  energiestandard?: Energiestandard;
  /** true, wenn ausgeführte Sanierungen vorliegen (für den Hinweistext). */
  saniert?: boolean;
}

export interface SpezHeizleistungErgebnis {
  spez: Wert;
  band: [number, number] | null;
  bandLabel: string;
  ampel: Ampel;
  text: string;
  hinweise: Hinweis[];
}

export function spezifischeHeizleistung(e: SpezHeizleistungEingabe, daten: FwsDaten): SpezHeizleistungErgebnis {
  const hinweise: Hinweis[] = [];
  const spezW = e.ebfM2.wert > 0 ? e.qhlUnsaniertW.wert / e.ebfM2.wert : 0;
  const spez = berechnet(spezW, 'W/m²', `Spez. Heizleistung = ${fmt(e.qhlUnsaniertW.wert, 0)} W / ${fmt(e.ebfM2.wert, 0)} m² EBF = ${fmt(spezW, 1)} W/m²${e.saniert ? ' (Zustand vor Sanierungen)' : ''}`, [e.qhlUnsaniertW, e.ebfM2], { quelle: 'FWS M3 Folie 37; Aufgabe 2' });
  if (!(e.ebfM2.wert > 0) || !(e.qhlUnsaniertW.wert > 0)) {
    return { spez, band: null, bandLabel: '', ampel: 'grau', text: 'Spezifische Heizleistung nicht beurteilbar (EBF oder Heizlast fehlt).', hinweise };
  }
  const tol = daten.plausibilitaet.bandToleranzProzent / 100;
  let band: [number, number] | null = null;
  let bandLabel = '';
  if (e.energiestandard === 'minergieP') {
    const b = daten.bauperioden.minergie.wM2.minergieP;
    band = [b[0]!, b[1]!];
    bandLabel = 'Minergie-P (Kurs, Aufgabe 3)';
  } else {
    const b = bauperiodeBandWm2(e.baujahr, e.gebaeudetyp, daten);
    if (b) {
      band = b.band;
      bandLabel = `${b.label} ${e.gebaeudetyp.toUpperCase()} unsaniert (Folie 37)`;
    }
  }
  if (!band) return { spez, band, bandLabel, ampel: 'grau', text: `Kein Referenzband für Baujahr ${e.baujahr}.`, hinweise };
  const [min, max] = band;
  let ampel: Ampel;
  let text: string;
  if (spezW >= min && spezW <= max) {
    ampel = 'gruen';
    text = `${fmt(spezW, 1)} W/m² liegt im Band ${min}–${max} W/m² (${bandLabel}) — plausibel.`;
  } else if (spezW < min) {
    ampel = spezW >= min * (1 - tol) ? 'gelb' : 'rot';
    text = `${fmt(spezW, 1)} W/m² liegt unter dem Band ${min}–${max} W/m² (${bandLabel}): Verbrauchsmethode vermutlich ungenau (Teilbelegung, zweiter Wärmeerzeuger, sehr gut gedämmt, Leichtbau) — raumweise Rechnung nach SIA 384/2 beiziehen.`;
  } else {
    ampel = spezW <= max * (1 + tol) ? 'gelb' : 'rot';
    text = `${fmt(spezW, 1)} W/m² liegt über dem Band ${min}–${max} W/m² (${bandLabel}): Wirkungsgrad, Heizwert, Verbrauch und Warmwasser-Anteil prüfen (überhöhte Raumtemperaturen? Verbundene Systeme?).`;
  }
  if (e.energiestandard === 'minergieP' || e.energiestandard === 'minergie') {
    hinweise.push({ stufe: 'info', code: 'plausi.minergie', text: 'Bei sehr gut gedämmten Gebäuden (Minergie/Minergie-P) liefert die Vollbetriebsstunden-Methode tendenziell zu tiefe Werte (Folie 10/16, Aufgabe 3).' });
  }
  if (ampel === 'rot') hinweise.push({ stufe: 'warnung', code: 'plausi.spez.rot', text });
  return { spez, band, bandLabel, ampel, text, hinweise };
}

export interface VergleichErgebnis {
  /** (Norm − Verbrauch)/Verbrauch [%]. */
  abweichung: Wert;
  ampel: Ampel;
  text: string;
}

/** Vergleich raumweise Norm-Heizlast (SIA 384/2, saldiert) mit der Verbrauchs-Heizlast; Erwartung Norm 10–25 % über Verbrauch. */
export function vergleichNormVerbrauch(qhlNormW: Wert, qhlVerbrauchW: Wert, daten: FwsDaten): VergleichErgebnis {
  const quelle = 'FWS M3 Aufgabe 3 Diskussion (SIA 384/2 enthält Reserven 10–20 %); Thermowerk-Annahme';
  if (!(qhlNormW.wert > 0) || !(qhlVerbrauchW.wert > 0)) {
    return { abweichung: berechnet(0, '%', 'Vergleich nicht möglich (ein Wert fehlt)', [], { quelle }), ampel: 'grau', text: 'Vergleich Norm/Verbrauch nicht möglich — beide Heizlasten nötig.' };
  }
  const abw = ((qhlNormW.wert - qhlVerbrauchW.wert) / qhlVerbrauchW.wert) * 100;
  const abweichung = berechnet(abw, '%', `Norm ${fmt(qhlNormW.wert / 1000, 2)} kW gegenüber Verbrauch ${fmt(qhlVerbrauchW.wert / 1000, 2)} kW: ${abw >= 0 ? '+' : ''}${fmt(abw, 1)} %`, [qhlNormW, qhlVerbrauchW], { quelle });
  const [lo, hi] = daten.plausibilitaet.qhlNormMinusVerbrauchErwartungProzent as [number, number];
  const gelbBis = daten.plausibilitaet.vergleichNormVerbrauch.gelbBisProzent;
  let ampel: Ampel;
  let text: string;
  if (abw >= lo && abw <= hi) {
    ampel = 'gruen';
    text = `Norm-Heizlast liegt ${fmt(abw, 0)} % über der Verbrauchs-Heizlast — entspricht der Erwartung (${lo}–${hi} %, Normreserve).`;
  } else if (abw >= 0 && abw < lo) {
    ampel = 'gelb';
    text = `Norm-Heizlast nur ${fmt(abw, 0)} % über dem Verbrauch — knapp; Hüllwerte eher optimistisch oder Verbrauch hoch (Teilbelegung, Raumtemperaturen).`;
  } else if (abw > hi && abw <= gelbBis) {
    ampel = 'gelb';
    text = `Norm-Heizlast ${fmt(abw, 0)} % über dem Verbrauch — höher als erwartet; U-Wert-Annahmen und Luftwechsel prüfen, Verbrauch auf Vollständigkeit prüfen.`;
  } else if (abw < 0) {
    ampel = 'rot';
    text = `Norm-Heizlast liegt ${fmt(-abw, 0)} % UNTER dem Verbrauch — unplausibel: Verbrauchsdaten (Jahre, WW-Anteil, η, Heizwert) und Hüllflächen prüfen.`;
  } else {
    ampel = 'rot';
    text = `Norm-Heizlast ${fmt(abw, 0)} % über dem Verbrauch — zu weit auseinander: U-Werte/Flächen der Hülle oder Verbrauchsdaten stimmen nicht.`;
  }
  return { abweichung, ampel, text };
}
