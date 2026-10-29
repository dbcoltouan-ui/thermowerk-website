import type { Herkunft, Wert } from '../../kern/wert';
import { fmt } from '../../kern/wert';
import { Popover } from './Popover';

/** Herkunftsklasse für die visuelle Markierung (Linienmuster am Wert, siehe komponenten.css). */
export type HerkunftKlasse = 'eingabe' | 'berechnet' | 'tabelle' | 'geschaetzt' | 'standard' | 'override';

export function herkunftKlasse(w: Pick<Wert<unknown>, 'herkunft' | 'stufe'>): HerkunftKlasse {
  switch (w.herkunft) {
    case 'eingabe':
    case 'messung':
      return 'eingabe';
    case 'berechnet':
      return 'berechnet';
    case 'tabelle':
      return 'tabelle';
    case 'schaetzung':
      return 'geschaetzt';
    case 'fallback':
      return w.stufe === 'standardwert' ? 'standard' : 'geschaetzt';
    case 'override':
      return 'override';
  }
}

const HERKUNFT_TEXT: Record<Herkunft, string> = {
  eingabe: 'Eingabe',
  messung: 'gemessen',
  tabelle: 'Tabellenwert',
  schaetzung: 'geschätzt',
  fallback: 'Fallback',
  override: 'überschrieben',
  berechnet: 'berechnet',
};

/** Kurztext des Chips, z. B. «geschätzt aus Baujahr 1965 · ±25 %». */
export function herkunftKurz(w: Wert<unknown>): string {
  let text = w.herkunft === 'fallback' && w.stufe === 'standardwert' ? 'Standardwert' : HERKUNFT_TEXT[w.herkunft];
  if (w.herkunft === 'schaetzung' || (w.herkunft === 'fallback' && w.stufe !== 'standardwert')) {
    const kopf = w.begruendung.split(/[:(—;]/)[0]?.trim() ?? '';
    if (/^geschätzt\b/i.test(kopf) && kopf.length <= 40) text = kopf;
  }
  if (w.unsicherheit !== undefined && w.unsicherheit > 0) text += ` · ±${fmt(w.unsicherheit, 0)} %`;
  return text;
}

/** Spanne in der Einheit des Werts als Text. */
export function bandText(w: Wert<unknown>, dez = 1): string | null {
  if (!w.band) return null;
  return `${fmt(w.band[0], dez)} – ${fmt(w.band[1], dez)} ${w.einheit}`;
}

interface ChipProps {
  wert: Wert<unknown>;
  testid?: string | undefined;
}

/** Herkunfts-Chip: Kurztext; Klick zeigt Begründung, Quelle und Spanne (UX-50–52). */
export function HerkunftChip({ wert, testid }: ChipProps) {
  const k = herkunftKlasse(wert);
  const band = bandText(wert);
  return (
    <Popover knopf={<><span class={`herkunft-muster herkunft-muster--${k}`} aria-hidden="true" />{herkunftKurz(wert)}</>} label={`Herkunft: ${herkunftKurz(wert)}`} knopfKlasse={`chip chip--${k}`} testid={testid}>
      <span class="popover__titel">{HERKUNFT_TEXT[wert.herkunft] === 'Fallback' && wert.stufe === 'standardwert' ? 'Standardwert' : HERKUNFT_TEXT[wert.herkunft]}</span>
      <span class="popover__text">{wert.begruendung}</span>
      {band && <span class="popover__meta">Spanne {band}</span>}
      {wert.quelle && <span class="popover__meta">Quelle: {wert.quelle}</span>}
    </Popover>
  );
}

interface WertProps {
  wert: Wert | null | undefined;
  /** Formatierte Anzeige (Formatierung ist Sache der UI). */
  text: string;
  testid?: string | undefined;
  gross?: boolean;
  /** Chip auch bei Eingaben zeigen. */
  immerChip?: boolean;
}

/** Ein Ergebniswert mit Herkunftsmarkierung; ohne Wert «—». */
export function WertAnzeige({ wert, text, testid, gross, immerChip }: WertProps) {
  if (!wert) {
    return (
      <span class={`wert leer${gross ? ' wert--gross' : ''}`} data-testid={testid}>
        —
      </span>
    );
  }
  const k = herkunftKlasse(wert);
  const chip = immerChip || (k !== 'eingabe' && (k !== 'berechnet' || !!wert.unsicherheit || !!wert.band));
  return (
    <span class={`wert wert--${k}${gross ? ' wert--gross' : ''}`}>
      <span class="wert__zahl" data-testid={testid}>
        {text}
      </span>
      {chip && <HerkunftChip wert={wert} testid={testid ? `${testid}-herkunft` : undefined} />}
    </span>
  );
}
