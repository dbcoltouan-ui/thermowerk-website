import { useEffect, useRef } from 'preact/hooks';
import type { SchrittDef, SchrittId, SchrittStatus } from '../schritte';
import { STATUS_TEXT } from '../schritte';

interface Props {
  schritte: ReadonlyArray<SchrittDef>;
  /** Aktiver Schritt; null, solange ein Zusatzmodul offen ist. */
  aktiv: SchrittId | null;
  status: Partial<Record<string, SchrittStatus>>;
  onWahl: (id: SchrittId) => void;
  /** Offenes Zusatzmodul (eigene Gruppe am Ende der Leiste, ohne Status). */
  zusatz?: string | null;
  onZusatz?: () => void;
}

/**
 * Schrittleiste: nur relevante Schritte, Status je Schritt aus dem Ergebnis. Sticky unter der Topbar;
 * mobil kompakt (Nummern, aktiver Schritt mit Titel), der aktive Schritt wird in den sichtbaren Bereich gerollt.
 */
export function Schrittleiste({ schritte, aktiv, status, onWahl, zusatz = null, onZusatz }: Props) {
  const liste = useRef<HTMLOListElement>(null);
  // Aktiven Schritt horizontal in die Mitte der Leiste rollen — nur die Leiste scrollt, nie die Seite (Session 7b).
  useEffect(() => {
    const l = liste.current;
    const el = l?.querySelector<HTMLElement>('[aria-current="step"], [aria-current="page"]');
    if (!l || !el) return;
    const lr = l.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const ziel = l.scrollLeft + (er.left - lr.left) - (l.clientWidth - er.width) / 2;
    const max = Math.max(0, l.scrollWidth - l.clientWidth);
    const links = Math.max(0, Math.min(max, ziel));
    if (typeof l.scrollTo === 'function') l.scrollTo({ left: links, behavior: 'smooth' });
    else l.scrollLeft = links;
  }, [aktiv, zusatz]);
  const index = schritte.findIndex((s) => s.id === aktiv);
  return (
    <nav class="stepper" aria-label="Schritte">
      <ol class="stepper__liste" ref={liste}>
        {schritte.map((s) => {
          const st = status[s.id] ?? 'offen';
          return (
            <li class="stepper__schritt" key={s.id}>
              <button type="button" class={`stepper__btn stepper__btn--${st}`} aria-current={s.id === aktiv ? 'step' : undefined} onClick={() => onWahl(s.id)} data-testid={`schritt-${s.id}`} data-status={st} title={`${s.titel}: ${STATUS_TEXT[st]}`}>
                <span class="stepper__nr">{s.nr}</span>
                <span class="stepper__titel">{s.kurz}</span>
                <span class="visually-hidden">, {STATUS_TEXT[st]}</span>
              </button>
            </li>
          );
        })}
        {onZusatz && (
          <li class="stepper__schritt stepper__schritt--zusatz">
            <button type="button" class="stepper__btn stepper__btn--zusatz" aria-current={zusatz ? 'page' : undefined} onClick={onZusatz} data-testid="schritt-zusatz" title="Zusatzmodule: Förderung, Bewilligung, Offerte">
              <span class="stepper__nr">+</span>
              <span class="stepper__titel">Zusatzmodule</span>
            </button>
          </li>
        )}
      </ol>
      <span class="stepper__position" aria-hidden="true">
        {zusatz ? '+' : `${index + 1}/${schritte.length}`}
      </span>
    </nav>
  );
}
