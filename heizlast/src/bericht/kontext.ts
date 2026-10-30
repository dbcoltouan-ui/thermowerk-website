/**
 * Eingang des Berichts (Session 9): das EINE Ergebnis aus `berechne()` plus der State für reine Anzeige-Angaben
 * (Projekt, Adresse, Masse der Heizflächen, Erfassungsart …). Der Bericht rechnet nie aus dem State
 * (KONTEXT §2 «Eine Quelle der Wahrheit»): Zahlen kommen aus `ergebnis`, der State liefert nur Beschriftungen.
 */
import type { Datensatz } from '../daten/index';
import type { FirmaDaten } from '../daten/firma';
import type { Ergebnis } from '../kern/berechne';
import type { Energietraeger, WpQuelle } from '../kern/typen';
import type { State } from '../state/schema';
import { einheitAnzeige } from '../ui/format';

export interface BerichtDaten {
  state: State;
  ergebnis: Ergebnis;
  daten: Datensatz;
  firma: FirmaDaten;
  /** Erstellungsdatum ISO (JJJJ-MM-TT). */
  datum: string;
  /** URL des Logos (App: Basis-Pfad + `firma.logo`); ohne Angabe kein Bild. */
  logoUrl?: string | undefined;
}

export const GEBAEUDETYP: Record<string, string> = { efh: 'Einfamilienhaus', mfh: 'Mehrfamilienhaus' };
export const KELLER: Record<string, string> = { unbeheizt: 'unbeheizt', beheizt: 'beheizt', keiner: 'kein Keller' };
export const ENERGIESTANDARD: Record<string, string> = { minergie: 'Minergie', minergieP: 'Minergie-P' };
export const WP_QUELLE: Record<WpQuelle, string> = { luftWasser: 'Luft/Wasser', soleWasser: 'Sole/Wasser', wasserWasser: 'Wasser/Wasser' };

/** Beschriftung und Einheit eines Energieträgers in der gewählten Heizwert-Konvention. */
export function traegerText(b: BerichtDaten, t: Energietraeger): { label: string; einheit: string } {
  const info = b.daten.fws.heizwerte.konventionen[b.state.verbrauch.konvention]?.traeger[t];
  return { label: info?.label ?? t, einheit: einheitAnzeige(info?.einheit) };
}

/** Datum ISO → T.M.JJJJ. */
export function datumText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])}.${Number(m[2])}.${m[1]}` : iso;
}

/** Titel einer Quelle aus dem `_meta` einer Datendatei (Normen/Quellen-Kapitel). */
export function quelleAus(meta: { quellen: ReadonlyArray<{ id: string; titel: string }> }, id: string): string | null {
  return meta.quellen.find((q) => q.id === id)?.titel ?? null;
}
