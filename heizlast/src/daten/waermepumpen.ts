/**
 * Loader + Schema für `data/waermepumpen.json` (normalisiert in Session 2, genutzt ab Session 6).
 * `waermepumpenDaten()` gibt das JSON ohne Cast zurück (tsc prüft das Schema beim Build).
 */
import wpJson from '@data/waermepumpen.json';
import type { Meta } from './fws';

export interface WpPlausibilitaet {
  qA2ausCopMalPKW: number | null;
  verhaeltnisQA2ZuQm7: number | null;
  unplausibel: boolean;
  hinweis: string | null;
}

export interface WpGeraet {
  id: string;
  kategorie: string;
  /** luft | sole | wasser (heute nur luft in der DB). */
  quelle: string;
  marke: string;
  serie: string | null;
  modell: string;
  variante: string | null;
  aufstellung: string | null;
  heizleistungA7W35KW: number | null;
  copA7W35: number | null;
  copA2W35: number | null;
  vorlaufMaxC: number | null;
  mindestPufferLiter: number | null;
  schallNachtMaxDb: number | null;
  preisChf: number | null;
  katalogseite: number | null;
  verifikationHinweis: string | null;
  plausibilitaet: WpPlausibilitaet;
}

export interface WpDaten {
  _meta: Meta;
  geraete: WpGeraet[];
}

/** Wärmepumpen-Gerätedatenbank (data/waermepumpen.json). */
export function waermepumpenDaten(): WpDaten {
  return wpJson;
}
