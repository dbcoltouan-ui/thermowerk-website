/**
 * Ampel-Skalen (Session 6, Wunsch Daniel 29.10.): statt nur einer Farbe eine Prozent- bzw. Temperaturachse mit
 * grünen, gelben und roten Bereichen und einer Marke für den aktuellen Wert — man sieht, ob 3 % oder 20 % bis
 * zum Kippen fehlen. Der Kern liefert Bereiche, Achse und Wert; die UI zeichnet nur.
 */
import type { FwsDaten } from '../daten/fws';
import type { HkDaten } from '../daten/heizkoerper';
import type { Ampel } from './typen';

export interface SkalaBereich {
  von: number;
  bis: number;
  ampel: Exclude<Ampel, 'grau'>;
  label: string;
}

export interface Skala {
  titel: string;
  einheit: string;
  /** Achsenbereich für die Darstellung (Werte ausserhalb werden am Rand gezeigt). */
  min: number;
  max: number;
  /** Aktueller Wert; null = nicht bestimmbar (Marke fehlt). */
  wert: number | null;
  ampel: Ampel;
  bereiche: SkalaBereich[];
  /** Beschriftete Grenzen (Kursregel etc.). */
  marken: { wert: number; label: string }[];
}

export function ampelAufSkala(bereiche: ReadonlyArray<SkalaBereich>, wert: number | null): Ampel {
  if (wert === null || !Number.isFinite(wert)) return 'grau';
  // Grenzwerte gehören zum grünen Bereich (z. B. Q_WP = Q_h oder genau Q_h = 0.75 · Q_WP).
  for (const b of bereiche) if (b.ampel === 'gruen' && wert >= b.von - 1e-9 && wert <= b.bis + 1e-9) return b.ampel;
  // Sonst gilt an einer Grenze der mildere Bereich (gelb vor rot).
  for (const stufe of ['gelb', 'rot'] as const) for (const b of bereiche) if (b.ampel === stufe && wert >= b.von - 1e-9 && wert <= b.bis + 1e-9) return b.ampel;
  return 'grau';
}

/**
 * WP-Grösse gegenüber dem Bedarf: Übergrösse = (Q_WP / Q_h − 1) · 100 [%].
 * Grenzen aus fws.json `geraetewahl` (r = Q_h/Q_WP): grün 0 … +33 % (Kurs: Q_h ≥ 0.75 · Q_WP),
 * gelb −9 … 0 % (knapp, Elektroeinsatz deckt die Spitze) und +33 … +67 %, sonst rot.
 */
export function skalaWpGroesse(fws: FwsDaten, uebergroesseProzent: number | null): Skala {
  const g = fws.geraetewahl;
  const knapp = (1 / g.knappGelbBis - 1) * 100;
  const gruenBis = (1 / g.inverterMinVerhaeltnis - 1) * 100;
  const gelbBis = (1 / g.ueberdimensioniertRotUnter - 1) * 100;
  const bereiche: SkalaBereich[] = [
    { von: -100, bis: knapp, ampel: 'rot', label: 'zu klein — bivalenter Betrieb' },
    { von: knapp, bis: 0, ampel: 'gelb', label: 'knapp — Spitze über Elektroeinsatz' },
    { von: 0, bis: gruenBis, ampel: 'gruen', label: 'passend (Kurs-Faustregel)' },
    { von: gruenBis, bis: gelbBis, ampel: 'gelb', label: 'überdimensioniert' },
    { von: gelbBis, bis: 1000, ampel: 'rot', label: 'deutlich überdimensioniert' },
  ];
  return {
    titel: 'WP-Grösse gegenüber Bedarf',
    einheit: '%',
    min: -30,
    max: 100,
    wert: uebergroesseProzent,
    ampel: ampelAufSkala(bereiche, uebergroesseProzent),
    bereiche,
    marken: [
      { wert: 0, label: 'Q_WP = Q_h' },
      { wert: gruenBis, label: `Q_h = ${g.inverterMinVerhaeltnis} · Q_WP` },
    ],
  };
}

/** Auslegungs-Vorlauf gegen die WP-Tauglichkeit (heizkoerper-tabellen.json `ampel.vorlaufC`: ≤ 55 gut, ≤ 65 kritisch). */
export function skalaVorlauf(hk: HkDaten, tVL: number | null): Skala {
  const { gutBis, kritischBis } = hk.ampel.vorlaufC;
  const bereiche: SkalaBereich[] = [
    { von: -50, bis: gutBis, ampel: 'gruen', label: 'WP-tauglich' },
    { von: gutBis, bis: kritischBis, ampel: 'gelb', label: 'kritisch — Effizienz sinkt' },
    { von: kritischBis, bis: 200, ampel: 'rot', label: 'ungeeignet ohne Massnahmen' },
  ];
  return {
    titel: 'Auslegungs-Vorlauf',
    einheit: '°C',
    min: 30,
    max: 80,
    wert: tVL,
    ampel: ampelAufSkala(bereiche, tVL),
    bereiche,
    marken: [
      { wert: gutBis, label: `${gutBis} °C` },
      { wert: kritischBis, label: `${kritischBis} °C` },
    ],
  };
}
