import { useEffect, useRef } from 'preact/hooks';
import type { SchrittDef, SchrittId, SchrittStatus } from '../schritte';
import { STATUS_TEXT } from '../schritte';

interface Props {
  schritte: ReadonlyArray<SchrittDef>;
  aktiv: SchrittId;
  status: Partial<Record<string, SchrittStatus>>;
  onWahl: (id: SchrittId) => void;
}

/**
 * Schrittleiste: nur relevante Schritte, Status je Schritt aus dem Ergebnis. Sticky unter der Topbar;
 * mobil kompakt (Nummern, aktiver Schritt mit Titel), der aktive Schritt wird in den sichtbaren Bereich gerollt.
 */
export function Schrittleiste({ schritte, aktiv, status, onWahl }: Props) {
  const liste = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = liste.current?.querySelector<HTMLElement>('[aria-current="step"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [aktiv]);
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
      </ol>
      <span class="stepper__position" aria-hidden="true">
        {index + 1}/{schritte.length}
      </span>
    </nav>
  );
}
