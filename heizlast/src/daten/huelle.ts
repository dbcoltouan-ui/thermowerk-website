/**
 * Loader + Schema für `data/huelle-epochen.json` (Session 2, erweitert Session 4).
 *
 * Die Interfaces beschreiben die vom Kern (`kern/huelle.ts`) genutzten Teile; `huelleDaten()` gibt das JSON
 * ohne Cast zurück, d. h. tsc prüft beim Build, dass die Datei zum Schema passt. Der Kern liest nie Dateien.
 */
import huelleJson from '@data/huelle-epochen.json';
import type { Meta } from './fws';

export type Richtung = 'horizontal' | 'aufwaerts' | 'abwaerts';
export type Grenze = 'aussen' | 'erdreich' | 'hinterlueftet' | 'unbeheizt';

/** Eine Schicht des Default-Aufbaus: Baustoff (`material`) oder Dämmstoff (`daemmstoff`), Dicke in m. */
export interface SchichtDaten {
  material?: string;
  daemmstoff?: string;
  dickeM: number;
  rolle: string;
  label: string;
}

export interface EpocheDaten {
  key: string;
  label: string;
  von: number | null;
  bis: number | null;
}

export interface Material {
  label: string;
  lambda: number | null;
  rHorizontal?: number;
  rAufwaerts?: number;
  rAbwaerts?: number;
  quelle: string[];
  abgeleitet?: boolean;
  hinweis?: string;
}

export interface Daemmstoff {
  label: string;
  lambda: number;
  spanne: number[];
  nichtUeberwacht?: number;
  quelle: string[];
  abgeleitet?: boolean;
  hinweis?: string;
}

export interface Bauweise {
  label: string;
  traglschicht?: string;
  dickenTypischM?: number[];
  schichtenTyp?: string;
  /** Pauschal-U [W/m²K] für inhomogene Konstruktionen ohne Schichtrechnung. */
  uPauschal?: number;
  /** Schichtvorlage (Session 4) für Bauweisen, die in keinem Epochen-Default vorkommen. */
  schichten?: SchichtDaten[];
  epochenTypisch: string[];
  quelle: string[];
  hinweis?: string;
}

export interface EpochenDefault {
  bauweise: string;
  schichten: SchichtDaten[];
  uSpanne: { min: number; max: number };
  uDefaultBerechnet: number;
  unsicherheitProzent: number;
  begruendung: string;
  quelle: string[];
}

export interface BauteilDaten {
  label: string;
  /** 'horizontal' | 'aufwaerts' | 'abwaerts' (JSON-String; der Kern prüft den Wert). */
  richtung: string;
  /** 'aussen' | 'erdreich' | 'hinterlueftet' | 'unbeheizt' (JSON-String; der Kern prüft den Wert). */
  grenze: string;
  epochen: Record<string, EpochenDefault>;
}

export interface FensterGeneration {
  key: string;
  label: string;
  ug: number;
  uwJeUf: number[];
  g?: number;
  periode?: string;
  quelle: string[];
  hinweis?: string;
  abgeleitet?: boolean;
}

export interface FensterEpoche {
  generation: string;
  rahmen: string;
  uwDefault: number;
  uSpanne: { min: number; max: number };
  unsicherheitProzent: number;
  begruendung: string;
  quelle: string[];
}

export interface TuerTyp {
  key: string;
  label: string;
  u: number;
  quelle: string[];
  hinweis?: string;
}

export interface InnenbauteilBauweise {
  label: string;
  schichten?: SchichtDaten[];
  uPauschal?: number;
  hinweis?: string;
}

export interface InnenbauteilDaten {
  richtung: string;
  default: string;
  bauweisen: Record<string, InnenbauteilBauweise>;
}

export interface HuelleDaten {
  _meta: Meta & {
    konventionen: {
      rsi: Record<string, number>;
      rseAussen: number;
      rseErdreich: number;
      daemmungUnbekanntLambda: number;
      formel: string;
      regelUnbekannterAufbau: string;
    };
    unsicherheitHinweis: string;
  };
  epochen: EpocheDaten[];
  materialien: Record<string, Material>;
  daemmstoffe: Record<string, Daemmstoff>;
  bauweisen: Record<string, Record<string, Bauweise>>;
  bauteile: Record<string, BauteilDaten>;
  fenster: {
    beschreibung: string;
    quelle: string[];
    ufSpalten: number[];
    rahmen: Record<string, { label: string; uf: number; spalte: number }>;
    generationen: FensterGeneration[];
    epochen: Record<string, FensterEpoche>;
    korrekturRaumtemperatur?: string;
    neigung?: string;
  };
  tueren: {
    typen: TuerTyp[];
    epochen: Record<string, { typ: string; spanne: number[] }>;
    hinweis?: string;
  };
  innenbauteile: {
    beschreibung: string;
    quelle: string[];
    innenwand: InnenbauteilDaten;
    innendecke: InnenbauteilDaten;
    innentuer: InnenbauteilDaten;
  };
  plausibilitaet: { uMaxWarnung: number; uMinWarnung: number };
}

/** Hüllen-Daten (data/huelle-epochen.json). */
export function huelleDaten(): HuelleDaten {
  return huelleJson;
}
