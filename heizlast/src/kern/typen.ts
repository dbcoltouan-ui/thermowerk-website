/** Gemeinsame Kern-Typen (Session 3). Domänensprache Deutsch, camelCase (KONTEXT §2 «Sprache/Stil»). */

export type Ampel = 'gruen' | 'gelb' | 'rot' | 'grau';

export type Energietraeger = 'heizoel' | 'erdgas' | 'hartholz' | 'nadelholz' | 'pellets' | 'strom' | 'fernwaerme';
export const ENERGIETRAEGER: ReadonlyArray<Energietraeger> = ['heizoel', 'erdgas', 'hartholz', 'nadelholz', 'pellets', 'strom', 'fernwaerme'];

/** Heizwert-Konvention: FWS-Kurs (Ho 10.5/10.4, Kurs-η) ist Default im FWS-Modus; Hi (BFE) als Option. */
export type Konvention = 'fwsKurs' | 'hi';

export type Gebaeudetyp = 'efh' | 'mfh';

/** Wärmequelle der Wärmepumpe. */
export type WpQuelle = 'luftWasser' | 'soleWasser' | 'wasserWasser';
