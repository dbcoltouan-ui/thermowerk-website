import type { ComponentChildren } from 'preact';
import type { SchrittDef } from '../schritte';

interface Props {
  schritt: SchrittDef;
  istErster: boolean;
  istLetzter: boolean;
  onZurueck: () => void;
  onWeiter: () => void;
  children: ComponentChildren;
}

/** Rahmen einer Schrittseite: Titel, Inhalt, Zurück/Weiter. */
export function SchrittSeite({ schritt, istErster, istLetzter, onZurueck, onWeiter, children }: Props) {
  return (
    <section class="inhalt" aria-labelledby="schritt-titel">
      <div class="inhalt__kopf">
        <h1 id="schritt-titel">
          <span class="mute">{schritt.nr} · </span>
          {schritt.titel}
        </h1>
      </div>
      {children}
      <div class="inhalt__nav">
        <button type="button" class="btn" onClick={onZurueck} disabled={istErster}>
          ← Zurück
        </button>
        <button type="button" class="btn btn--primary" onClick={onWeiter} disabled={istLetzter} data-testid="weiter">
          Weiter →
        </button>
      </div>
    </section>
  );
}
