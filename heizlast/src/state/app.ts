/**
 * App-Instanzen (Browser): ein Store, eine Projektverwaltung. Tests erzeugen eigene Instanzen über
 * `erstelleStore` / `erstelleProjektverwaltung`; dieses Modul wird nur von der UI importiert.
 */
import { alleDaten } from '../daten/index';
import { browserSpeicher, erstelleProjektverwaltung } from './persistenz';
import { erstelleStore } from './store';

export const daten = alleDaten();
export const store = erstelleStore({ daten });
export const verwaltung = erstelleProjektverwaltung({
  store,
  speicher: browserSpeicher(),
  bestaetigen: (frage) => globalThis.confirm?.(frage) ?? false,
});
