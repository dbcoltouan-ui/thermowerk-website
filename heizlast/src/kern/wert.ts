/**
 * Herkunftsmodell (KONTEXT §2 «Herkunftsmodell»).
 *
 * Jeder berechnete oder ergänzte Wert trägt seine Herkunft, eine Klartext-Begründung
 * und optional eine Unsicherheit. `Ergebnis.annahmen[]` sammelt alle Nicht-Eingaben;
 * der Bericht druckt sie im Kapitel «Annahmen & Unsicherheiten».
 *
 * Session 1 legt nur den Typ fest; keine Rechenlogik.
 */

export type Herkunft = 'eingabe' | 'messung' | 'tabelle' | 'schaetzung' | 'fallback' | 'override';

export interface Wert<T = number> {
  wert: T;
  /** SI-nah: intern W, °C, m², l — Formatierung nur in der UI. */
  einheit: string;
  herkunft: Herkunft;
  /** Fallback-Stufe, z. B. 'epoche' | 'bauweise' | 'daemmdicke'. */
  stufe?: string;
  /** Unsicherheit in ±% (relativ). */
  unsicherheit?: number;
  /** Klartext für UI-Chip und Bericht, z. B. «geschätzt aus Baujahr 1965, Backstein 30 cm ungedämmt». */
  begruendung: string;
  /** Norm/Seite/Tabelle oder Datenblatt-URL + Datum. */
  quelle?: string;
}

/** Hilfskonstruktor für direkte Eingaben (keine Annahme). */
export function eingabe<T = number>(wert: T, einheit: string, begruendung = 'Eingabe'): Wert<T> {
  return { wert, einheit, herkunft: 'eingabe', begruendung };
}

/** Ein Wert zählt als Annahme, wenn er nicht direkt eingegeben oder gemessen wurde. */
export function istAnnahme(w: Wert<unknown>): boolean {
  return w.herkunft !== 'eingabe' && w.herkunft !== 'messung';
}
