/**
 * Loader für `data/firma.json` (Session 9): Absender im Berichtskopf. Keine Fachdaten, kein Teil von `berechne`.
 */
import firmaJson from '@data/firma.json';
import type { Meta } from './fws';

export interface FirmaDaten {
  _meta: Meta;
  marke: string;
  firma: string;
  adresse: string;
  plzOrt: string;
  telefon: string;
  email: string;
  web: string;
  uid: string;
  /** Pfad relativ zur App (Vite-public). */
  logo: string;
}

export function firmaDaten(): FirmaDaten {
  return firmaJson;
}
