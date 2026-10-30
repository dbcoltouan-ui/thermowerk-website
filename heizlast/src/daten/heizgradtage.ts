/**
 * Loader + Schema für `data/heizgradtage.json` (Session 7b): Monats-Heizgradtage HGT 20/12 je SIA-2028-Station
 * aus MeteoSchweiz-Tagesmitteln (erzeugt mit `scripts/heizgradtage-bauen.mjs`). `heizgradtageDaten()` gibt das
 * JSON ohne Cast zurück (tsc prüft das Schema beim Build).
 */
import hgtJson from '@data/heizgradtage.json';
import type { Meta } from './fws';

export interface HgtStation {
  abk: string;
  name: string;
  quelle: string[];
  /** Jahr → 12 Monatswerte [Kd] (Januar … Dezember); `null` = Monat ohne verlässliche Daten; laufendes Jahr kürzer. */
  monate: Record<string, (number | null)[]>;
  /** Jahr → fehlende Tage je Monat (nur Jahre mit Lücken). */
  luecken: Record<string, number[]>;
  /** Kontrolle gegen SIA 2028 (Mittel 1984–2003 aus denselben Tagesdaten). */
  kontrolle: { mittel1984_2003: number | null; jahre: number; sia2028: number; abweichungProzent: number | null } | null;
  fehler?: string;
}

export interface HgtDaten {
  _meta: Meta & {
    parameter: { raumtemperaturC: number; heizgrenzeC: number; parameterOgd: string; maxFehltageJeMonat: number };
    zeitraum: { von: string; bis: string };
    kontrolle: string;
  };
  stationen: Record<string, HgtStation>;
}

/** Monats-Heizgradtage (data/heizgradtage.json). */
export function heizgradtageDaten(): HgtDaten {
  return hgtJson;
}
