/**
 * Datensatz für `berechne(state, daten)` (Session 6): alle Fachdaten als ein Parameter.
 * Der Kern liest nie selbst Dateien; Tests können einzelne Teile austauschen.
 */
import type { FwsDaten, HydraulikDaten } from './fws';
import { fwsDaten, hydraulikDaten } from './fws';
import type { HkDaten } from './heizkoerper';
import { heizkoerperDaten } from './heizkoerper';
import type { HgtDaten } from './heizgradtage';
import { heizgradtageDaten } from './heizgradtage';
import type { HuelleDaten } from './huelle';
import { huelleDaten } from './huelle';
import type { KlimaDaten } from './klima';
import { klimaDaten } from './klima';
import type { Sia3842Daten } from './sia384';
import { siaDaten } from './sia384';
import type { WpDaten } from './waermepumpen';
import { waermepumpenDaten } from './waermepumpen';

export interface Datensatz {
  fws: FwsDaten;
  hydraulik: HydraulikDaten;
  huelle: HuelleDaten;
  sia: Sia3842Daten;
  klima: KlimaDaten;
  hk: HkDaten;
  wp: WpDaten;
  /** Monats-Heizgradtage je Station (Session 7b). */
  hgt: HgtDaten;
}

export function alleDaten(): Datensatz {
  return {
    fws: fwsDaten(),
    hydraulik: hydraulikDaten(),
    huelle: huelleDaten(),
    sia: siaDaten(),
    klima: klimaDaten(),
    hk: heizkoerperDaten(),
    wp: waermepumpenDaten(),
    hgt: heizgradtageDaten(),
  };
}
