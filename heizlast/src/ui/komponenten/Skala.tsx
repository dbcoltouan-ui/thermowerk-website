import type { Skala as SkalaDaten } from '../../kern/skala';
import { fmt } from '../../kern/wert';

interface Props {
  skala: SkalaDaten;
  /** Text zum Wert, z. B. «WP 9 % grösser als Q_h». */
  text?: string | undefined;
  testid?: string;
}

/** Position auf der Achse in % (reine Darstellung; Werte ausserhalb werden an den Rand gesetzt). */
function pos(s: SkalaDaten, x: number): number {
  const t = (x - s.min) / (s.max - s.min);
  return Math.max(0, Math.min(1, t)) * 100;
}

/**
 * Ampel-Skala: Achse mit grünen/gelben/roten Bereichen und einer Marke für den aktuellen Wert
 * (Wunsch Daniel 29.10.: sichtbar, ob 3 % oder 20 % bis zum Kippen fehlen). Bereiche und Wert kommen
 * fertig aus dem Ergebnis; die Komponente zeichnet nur.
 */
export function Skala({ skala, text, testid }: Props) {
  const w = skala.wert;
  const ausserhalb = w !== null && (w < skala.min || w > skala.max);
  const vorzeichen = skala.einheit === '%' && w !== null && w > 0 ? '+' : '';
  return (
    <figure class="skala" data-ampel={skala.ampel} data-testid={testid}>
      <figcaption class="skala__kopf">
        <span class="mute">{skala.titel}</span>
        <strong class={`skala__wert skala__wert--${skala.ampel}`} data-testid={testid ? `${testid}-wert` : undefined}>
          {w === null ? '—' : `${vorzeichen}${fmt(w, skala.einheit === '%' ? 0 : 1)} ${skala.einheit}`}
          {ausserhalb ? ' (ausserhalb)' : ''}
        </strong>
      </figcaption>
      <div class="skala__achse" role="img" aria-label={`${skala.titel}: ${w === null ? 'kein Wert' : `${fmt(w, 1)} ${skala.einheit}`}`}>
        {skala.bereiche.map((b) => {
          const von = pos(skala, b.von);
          const bis = pos(skala, b.bis);
          if (bis <= von) return null;
          return <span key={`${b.von}`} class={`skala__bereich skala__bereich--${b.ampel}`} style={{ left: `${von}%`, width: `${bis - von}%` }} title={b.label} />;
        })}
        {skala.marken.map((m) => (
          <span key={`m${m.wert}`} class="skala__marke" style={{ left: `${pos(skala, m.wert)}%` }} title={m.label} />
        ))}
        {w !== null && <span class="skala__zeiger" style={{ left: `${pos(skala, w)}%` }} data-testid={testid ? `${testid}-zeiger` : undefined} />}
      </div>
      <div class="skala__beschriftung" aria-hidden="true">
        <span>{fmt(skala.min, 0)}</span>
        {skala.marken.map((m) => (
          <span key={`l${m.wert}`} style={{ left: `${pos(skala, m.wert)}%` }} class="skala__label">
            {fmt(m.wert, 0)}
          </span>
        ))}
        <span>{fmt(skala.max, 0)}</span>
      </div>
      {text && <p class="skala__text">{text}</p>}
    </figure>
  );
}
