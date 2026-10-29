/**
 * Anzeigetexte zur Methodenwahl. Das State-Schema v2 liegt in `schema.ts` (Session 6).
 */
import type { Methode } from './schema';

export type { Methode };

export const METHODEN: ReadonlyArray<{ id: Methode; titel: string; text: string }> = [
  {
    id: 'fws',
    titel: 'FWS-Kurs (Verbrauchsmethode)',
    text: 'Heizlast aus dem bisherigen Energieverbrauch nach FWS-Modul 3, mit Mehrjahres-Mittelung, jahresgenau gewichteten Sanierungen und Warmwasser/Speicher nach Kurs. Geeignet für Sanierungen mit bekannten Verbrauchsdaten.',
  },
  {
    id: 'raumweise',
    titel: 'Raumweise nach SIA 384/2:2020',
    text: 'Norm-Heizlast je Raum aus Gebäudehülle, Raumgeometrie und Mindestluftwechsel (Anwendung von SN EN 12831-1 in der Schweiz). Geeignet für Neubauten, umfassende Sanierungen und als Grundlage für Heizflächen.',
  },
];
