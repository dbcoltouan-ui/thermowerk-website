// Thermowerk Heizlast — Typen-Definitionen
// Basis: FWS Modul 3 (1-2025), SIA 384/1:2022, SIA 385/1:2020, SIA 385/2

/** Einheitliches Rückgabe-Objekt aller Rechenfunktionen. */
export interface CalcResult {
  /** Numerischer Hauptwert (z. B. Qhl in kW). */
  value: number;
  /** Einheit als Klartext (z. B. "kW", "kWh/a", "l/d"). */
  unit: string;
  /** Rechenweg — wird in der UI für die Option „Formeln einbeziehen" gerendert. */
  steps: CalcStep[];
  /** Bandbreite (min/max), wenn die Methode eine Spanne liefert (z. B. Bauperioden-Schätzung). */
  range?: [number, number];
  /** Plausibilitäts-Ampel. */
  ampel?: 'gruen' | 'gelb' | 'rot' | 'grau';
  /** Hinweis-Text zur Ampel. */
  hinweis?: string;
  /** Referenzband (min/max) aus FWS-Tabelle. */
  refBand?: [number, number] | null;
  /** Weitere Metadaten je nach Funktion. */
  [key: string]: unknown;
}

export interface CalcStep {
  /** Formel oder Bezeichner (links). */
  formel: string;
  /** Wert/Kommentar (rechts). */
  wert: string;
}

export type Gebaeudetyp = 'efh' | 'mfh' | 'buero';
export type Lage = 'mittelland' | 'hoehe';
export type TvollProfil =
  | 'wohnen_ohneWW'
  | 'wohnen_mitWW'
  | 'gewerbe_absenkung';

export interface Brennwert {
  label: string;
  ho: number;           // kWh pro Einheit
  einheit: string;      // Anzeige-Einheit Ho
  verbrauchEinheit: string; // Anzeige-Einheit Ba
}

export interface Wirkungsgrad {
  id: string;
  label: string;
  min: number;
  max: number;
  default: number;
}

export interface VollaststundenZeile {
  gebaeudetyp: TvollProfil;
  lage: Lage;
  tvoll: number;
  label: string;
}

export interface BauperiodenZeile {
  id: string;
  label: string;
  efh: [number, number];  // kWh/m²·a min/max
  mfh: [number, number];
}

export interface SpezHeizleistungZeile {
  id: string;
  efh: [number, number];  // W/m² min/max
  mfh: [number, number];
}

export interface SanierungsMassnahme {
  id: string;
  label: string;
  einsparung: [number, number];  // % min/max
  default: number;
}

export interface WwStandard {
  gebaeudetyp: 'efh' | 'mfh' | 'buero';
  label: string;
  vwu: number;  // l/Person/Tag
}

export interface SpeicherVerlustZeile {
  volumen: number;   // l
  verlust: number;   // kWh/d
}

export interface FstoZeile {
  id: string;
  label: string;
  faktor: number;
}

export interface WtFaustformelZeile {
  id: string;
  label: string;
  mPerKw: number;
}

export interface BivalenzZeile {
  wpAnteil: number;        // 0..1
  energieanteil: [number, number];  // % min/max
}

export interface VerlustFaktoren {
  /** Anteil Speicherverluste, z. B. 0.10 für 10 %. */
  speicher?: number;
  zirk?: number;
  ausstoss?: number;
}

export interface PersonenEinheit {
  anf: number;   // ANF in m²
  vwui: number;  // l/P/d
}
