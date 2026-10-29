/**
 * Schrittdefinitionen (Ziel-Navigationskonzept, befund_ux-datenfluss.md §5.1). Welche Schritte sichtbar sind,
 * entscheidet der Kern (`Ergebnis.relevanteSchritte`, kern/relevanz.ts `schrittRelevant`) — hier nur Texte.
 */
import type { SchrittId, SchrittStatus } from '../kern/relevanz';

export type { SchrittId, SchrittStatus };

export interface SchrittDef {
  id: SchrittId;
  nr: number;
  titel: string;
  /** Kurztitel für die Schrittleiste. */
  kurz: string;
  /** Ein Satz: wozu der Schritt dient. */
  zweck: string;
}

export const SCHRITTE: ReadonlyArray<SchrittDef> = [
  { id: 'projekt', nr: 0, titel: 'Projekt & Methode', kurz: 'Projekt', zweck: 'Projekt benennen und festlegen, wie die Heizlast bestimmt wird.' },
  { id: 'gebaeude', nr: 1, titel: 'Gebäude', kurz: 'Gebäude', zweck: 'Standort, Baujahr und Fläche — daraus folgen Aussentemperatur und Vergleichswerte.' },
  { id: 'sanierungen', nr: 2, titel: 'Sanierungen', kurz: 'Sanierungen', zweck: 'Ausgeführte und geplante Massnahmen mit Jahr; sie wirken je nach Methode auf den Verbrauch oder auf die Bauteile.' },
  { id: 'verbrauch', nr: 3, titel: 'Verbrauch', kurz: 'Verbrauch', zweck: 'Bisheriger Energieverbrauch oder Betriebsdaten — Grundlage der Heizlast nach FWS-Kurs.' },
  { id: 'huelle', nr: 3, titel: 'Hülle & Räume', kurz: 'Hülle & Räume', zweck: 'Bauteiltypen des Gebäudes und Räume mit ihren Flächen — Grundlage der raumweisen Heizlast.' },
  { id: 'heizlast', nr: 4, titel: 'Heizlast', kurz: 'Heizlast', zweck: 'Massgebende Heizlast mit Herkunft, Spanne und Rechenweg.' },
  { id: 'warmwasser', nr: 5, titel: 'Warmwasser', kurz: 'Warmwasser', zweck: 'Warmwasser über die neue Wärmepumpe.' },
  { id: 'waermeabgabe', nr: 6, titel: 'Wärmeabgabe', kurz: 'Wärmeabgabe', zweck: 'Heizkörper und Flächenheizungen je Raum — nötige Vorlauftemperatur.' },
  { id: 'zuschlaege', nr: 7, titel: 'Zuschläge & Leistung', kurz: 'Zuschläge', zweck: 'Sperrzeit und weitere Zuschläge zur Auslegungsleistung.' },
  { id: 'speicher', nr: 8, titel: 'Speicher & Hydraulik', kurz: 'Speicher', zweck: 'Warmwasserspeicher, Puffer und Ausdehnungsgefäss.' },
  { id: 'waermepumpe', nr: 9, titel: 'Wärmepumpe', kurz: 'Wärmepumpe', zweck: 'Gerät passend zu Leistung und Vorlauftemperatur.' },
  { id: 'bericht', nr: 10, titel: 'Bericht', kurz: 'Bericht', zweck: 'Vorschau, Vollständigkeit und Export.' },
];

/** Sichtbare Schritte in der Reihenfolge der Schrittfolge (Relevanz aus dem Ergebnis). */
export function sichtbareSchritte(relevant: ReadonlyArray<SchrittId>): SchrittDef[] {
  return SCHRITTE.filter((s) => relevant.includes(s.id));
}

export const STATUS_TEXT: Record<SchrittStatus, string> = {
  offen: 'offen',
  vollstaendig: 'vollständig',
  annahmen: 'mit Annahmen',
  warnung: 'Warnung',
};
