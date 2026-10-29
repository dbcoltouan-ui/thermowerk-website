/**
 * Loader + Schema für `data/klimastationen.json` (SIA 2028 Stationen; Session 2, erweitert Session 4).
 * `klimaDaten()` gibt das JSON ohne Cast zurück (tsc prüft das Schema beim Build).
 */
import klimaJson from '@data/klimastationen.json';
import type { Meta } from './fws';

export interface Station {
  key: string;
  name: string;
  abk: string;
  kanton: string;
  hoeheM: number;
  hoeheMQuelle: string;
  hoeheMAlternativ: number | null;
  /** Auslegungstemperatur «kalt» SIA 2028 Tabelle 6 [°C]. */
  thetaEC: number;
  thetaMin1hC: number;
  hgt2012Kd: number;
  atd12Kd: number;
  /** Jahresmittel nach SIA 381/2 (alt), null wenn nicht belegt. */
  jahresmittelAltC: number | null;
  hinweis: string | null;
}

export interface KlimaDaten {
  _meta: Meta;
  stationen: Station[];
  zuordnung: {
    beschreibung: string;
    quelle: string[];
    plz3: Record<string, string>;
    plz2: Record<string, string>;
    kanton: Record<string, string>;
    kantonaleRegeln: Record<string, string>;
    praxisregelHoehe: string;
  };
  hoehenkorrektur: {
    beschreibung: string;
    quelle: string[];
    schwelleDeltaHoeheM: number;
    gradientKPro100m: number;
    gradientSpanne: number[];
    unsicherheitK: number;
    maxKorrekturK: number;
    hinweisTraegheit: string;
    jahresmittel: string;
  };
  /** Standardwert θe ohne Standort/Station (Session 6), überschreibbar. */
  standardThetaE: { beschreibung: string; quelle: string[]; thetaEC: number };
  jahresmittel: {
    beschreibung: string;
    quelle: string[];
    aC: number;
    bKPro100m: number;
    unsicherheitK: number;
    rmseK: number;
  };
}

/** Klimadaten (data/klimastationen.json). */
export function klimaDaten(): KlimaDaten {
  return klimaJson;
}
