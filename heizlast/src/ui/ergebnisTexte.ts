/**
 * Klartexte aus dem Ergebnis, die Schrittseiten und Bericht gleich sagen (eine Quelle, keine Rechnung).
 */
import type { Ergebnis } from '../kern/berechne';
import type { ZeitraumErgebnis } from '../kern/fws';
import { datumMonat, zahl } from './format';

/** Woher der Vorlauf des Gerätefilters kommt (Schritt 9 und Bericht). */
export function filterVorlaufHerkunft(e: Ergebnis): string {
  const std = e.geraet.filterVorlaufStandard;
  if (!std) return '';
  if (std !== e.auslegungsVL) return `aus der Warmwasser-Ladetemperatur (höher als der Heizungs-Vorlauf ${zahl(e.auslegungsVL.wert, '°C', 1)})`;
  const g = e.waermeabgabe?.gebaeude;
  if (e.auslegungsVL.stufe === 'heizflaechen' && g?.massgebenderRaum) return `aus Heizflächen, max. Raum: ${g.massgebenderRaum.name}`;
  if (e.auslegungsVL.stufe === 'heizkreis') return 'höchster Heizkreis-Vorlauf (Schritt 6)';
  if (e.auslegungsVL.herkunft === 'override') return 'Auslegungs-Vorlauf manuell (Schritt 6)';
  return 'Standardwert des Wärmeabgabesystems (Schritt 6) — mit erfassten Heizflächen genauer';
}

/** Methode als Kurzname (Dashboard-Badge, Projektliste, Bericht). */
export function methodeKurz(m: Ergebnis['methode']): string {
  return m === 'fws' ? 'FWS-Kurs' : m === 'raumweise' ? 'SIA 384/2' : 'Methode offen';
}

/** Wirkung jeder ausgeführten Sanierung auf einen Verbrauchszeitraum (Schritt 2/3 und Bericht). */
export function sanierungBezugTexte(z: ZeitraumErgebnis): { lage: 'vorher' | 'innerhalb' | 'nachher'; schluessel: string; text: string }[] {
  const s = z.sanierung;
  return s.bezug.map((b) => ({
    lage: b.lage,
    schluessel: `${b.id ?? b.label}${b.datumMs}`,
    text: `${b.label} ${datumMonat(b.datumMs)}: ${
      b.lage === 'innerhalb'
        ? `mitten im Zeitraum (${s.subperioden.map((sp) => `${sp.tage} d × ${sp.faktor.toFixed(2)}`).join(' + ')})`
        : b.lage === 'vorher'
          ? `nach dem Zeitraum — Verbrauch wird um Faktor ${(s.faktorIst / s.faktorUnsaniert).toFixed(3)} umgerechnet`
          : 'vor dem Zeitraum — bereits im Verbrauch enthalten'
    }`,
  }));
}
