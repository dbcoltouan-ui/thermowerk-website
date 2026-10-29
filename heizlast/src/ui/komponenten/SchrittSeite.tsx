import type { ComponentChildren } from 'preact';
import type { SchrittDef } from '../schritte';

interface Props {
  schritt: SchrittDef;
  vorher: SchrittDef | undefined;
  nachher: SchrittDef | undefined;
  onWahl: (s: SchrittDef) => void;
  children: ComponentChildren;
}

/** Rahmen einer Schrittseite: Titel mit Zweck, Inhalt, Zurück/Weiter mit Ziel. */
export function SchrittSeite({ schritt, vorher, nachher, onWahl, children }: Props) {
  return (
    <section class="inhalt" aria-labelledby="schritt-titel" data-testid={`seite-${schritt.id}`}>
      <div class="inhalt__kopf">
        <span class="inhalt__nr" aria-hidden="true">
          {schritt.nr}
        </span>
        <div>
          <h1 id="schritt-titel">{schritt.titel}</h1>
          <p>{schritt.zweck}</p>
        </div>
      </div>
      {children}
      <nav class="inhalt__nav" aria-label="Schritt wechseln">
        <button type="button" class="btn" onClick={() => vorher && onWahl(vorher)} disabled={!vorher} data-testid="zurueck">
          Zurück{vorher ? `: ${vorher.kurz}` : ''}
        </button>
        <button type="button" class="btn btn--primary" onClick={() => nachher && onWahl(nachher)} disabled={!nachher} data-testid="weiter">
          Weiter{nachher ? `: ${nachher.kurz}` : ''}
        </button>
      </nav>
    </section>
  );
}
