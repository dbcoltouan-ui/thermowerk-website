import type { SchrittDef, SchrittStatus } from '../schritte';
import { STATUS_TEXT } from '../schritte';

interface Props {
  schritte: ReadonlyArray<SchrittDef>;
  aktiv: number;
  status: Record<string, SchrittStatus>;
  onWahl: (index: number) => void;
}

export function Schrittleiste({ schritte, aktiv, status, onWahl }: Props) {
  return (
    <nav class="stepper" aria-label="Schritte">
      <ol class="stepper__liste">
        {schritte.map((s, i) => {
          const st = status[s.id] ?? 'offen';
          return (
            <li class="stepper__schritt" key={s.id}>
              <button
                type="button"
                class="stepper__btn"
                aria-current={i === aktiv ? 'step' : undefined}
                onClick={() => onWahl(i)}
                data-testid={`schritt-${s.id}`}
              >
                <span class="stepper__nr">{s.nr}</span>
                <span class="stepper__titel">{s.kurz}</span>
                <span class={`status-punkt status-punkt--${st}`} title={STATUS_TEXT[st]} />
                <span class="visually-hidden">{STATUS_TEXT[st]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
