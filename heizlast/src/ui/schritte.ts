/**
 * Schrittdefinitionen der Shell (Ziel-Navigationskonzept, befund_ux-datenfluss.md §5).
 * Session 1: nur Struktur und Status-Platzhalter. Relevanz je Modus und echte
 * Status kommen mit `relevant()` / `Ergebnis.status` in Session 6/7.
 */
import type { Methode } from '../state/typen';

export type SchrittStatus = 'offen' | 'vollstaendig' | 'annahmen' | 'warnung';

export interface SchrittDef {
  id: string;
  nr: number;
  titel: string;
  /** Kurztitel für die Schrittleiste. */
  kurz: string;
  /** Platzhalter: für welche Modi der Schritt relevant ist. */
  modi: ReadonlyArray<Methode>;
}

export const SCHRITTE: ReadonlyArray<SchrittDef> = [
  { id: 'projekt', nr: 0, titel: 'Projekt & Methode', kurz: 'Projekt', modi: ['fws', 'raumweise'] },
  { id: 'gebaeude', nr: 1, titel: 'Gebäude', kurz: 'Gebäude', modi: ['fws', 'raumweise'] },
  { id: 'sanierungen', nr: 2, titel: 'Sanierungen', kurz: 'Sanierungen', modi: ['fws', 'raumweise'] },
  { id: 'verbrauch', nr: 3, titel: 'Verbrauch', kurz: 'Verbrauch', modi: ['fws'] },
  { id: 'huelle', nr: 3, titel: 'Hülle & Räume', kurz: 'Hülle & Räume', modi: ['raumweise'] },
  { id: 'heizlast', nr: 4, titel: 'Heizlast', kurz: 'Heizlast', modi: ['fws', 'raumweise'] },
  { id: 'warmwasser', nr: 5, titel: 'Warmwasser', kurz: 'Warmwasser', modi: ['fws', 'raumweise'] },
  { id: 'waermeabgabe', nr: 6, titel: 'Wärmeabgabe', kurz: 'Wärmeabgabe', modi: ['fws', 'raumweise'] },
  { id: 'zuschlaege', nr: 7, titel: 'Zuschläge & Leistung', kurz: 'Zuschläge', modi: ['fws', 'raumweise'] },
  { id: 'speicher', nr: 8, titel: 'Speicher & Hydraulik', kurz: 'Speicher', modi: ['fws', 'raumweise'] },
  { id: 'waermepumpe', nr: 9, titel: 'Wärmepumpe', kurz: 'Wärmepumpe', modi: ['fws', 'raumweise'] },
  { id: 'bericht', nr: 10, titel: 'Bericht', kurz: 'Bericht', modi: ['fws', 'raumweise'] },
];

/** Schritte, die für die gewählte Methode sichtbar sind (ohne Methode: beide Varianten von Schritt 3 ausgeblendet). */
export function sichtbareSchritte(methode: Methode | null): SchrittDef[] {
  return SCHRITTE.filter((s) => (methode ? s.modi.includes(methode) : s.modi.length === 2));
}

export const STATUS_TEXT: Record<SchrittStatus, string> = {
  offen: 'offen',
  vollstaendig: 'vollständig',
  annahmen: 'mit Annahmen',
  warnung: 'Warnung',
};
