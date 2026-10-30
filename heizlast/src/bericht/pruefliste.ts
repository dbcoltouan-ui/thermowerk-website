/**
 * Vollständigkeits-Check vor dem Export (Session 9, befund_ux-datenfluss UX-48): fehlende Pflichtangaben und
 * Fehler sperren den Druck; Warnungen lassen sich nach Durchsicht übersteuern. Liest nur das Ergebnis.
 */
import type { Ergebnis } from '../kern/berechne';
import type { SchrittId } from '../kern/relevanz';

export interface PruefPunkt {
  schritt: SchrittId;
  text: string;
  pfad?: string | undefined;
}

export interface Pruefliste {
  /** Pflichtangaben fehlen oder ein Teil ist nicht berechenbar — sperrt den Druck. */
  offen: PruefPunkt[];
  /** Warnungen — übersteuerbar. */
  warnungen: PruefPunkt[];
}

/**
 * Schritte, deren fehlende Angaben den Bericht nicht unvollständig machen: ohne Gerätewahl (Schritt 9) ist die
 * Heizlast- und Heizflächen-Auslegung vollständig — das Kapitel Wärmepumpe entfällt dann (z. B. wenn kein Gerät
 * der Datenbank passt). Darum Warnung statt Sperre.
 */
const NUR_WARNUNG: ReadonlyArray<SchrittId> = ['waermepumpe'];

export function pruefliste(e: Ergebnis): Pruefliste {
  const fehlend = e.vollstaendigkeit.map((f) => ({ schritt: f.schritt, text: f.text, pfad: f.pfad }));
  const offen: PruefPunkt[] = [
    ...fehlend.filter((f) => !NUR_WARNUNG.includes(f.schritt)),
    ...e.hinweise.filter((h) => h.stufe === 'fehler').map((h) => ({ schritt: h.schritt, text: h.text, pfad: h.pfad })),
  ];
  const warnungen: PruefPunkt[] = [
    ...fehlend.filter((f) => NUR_WARNUNG.includes(f.schritt)).map((f) => ({ ...f, text: `${f.text} — der Bericht erscheint ohne Kapitel Wärmepumpe.` })),
    ...e.hinweise.filter((h) => h.stufe === 'warnung').map((h) => ({ schritt: h.schritt, text: h.text, pfad: h.pfad })),
  ];
  return { offen, warnungen };
}

/** Druck erlaubt: nichts offen, Warnungen keine oder bestätigt. */
export function druckFreigegeben(p: Pruefliste, warnungenBestaetigt: boolean): boolean {
  return p.offen.length === 0 && (p.warnungen.length === 0 || warnungenBestaetigt);
}
