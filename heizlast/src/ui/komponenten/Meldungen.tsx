import type { ErgebnisHinweis } from '../../kern/berechne';
import type { SchrittId } from '../../kern/relevanz';
import { store } from '../bindung';

/** Hinweise eines Schritts als Block (z. B. Klima, Streuung); Filter nach Code-Präfix. */
export function Meldungen({ schritt, codes, ohne, testid }: { schritt: SchrittId; codes?: ReadonlyArray<string>; ohne?: ReadonlyArray<string>; testid?: string }) {
  const hs: ErgebnisHinweis[] = store.ergebnis.value.hinweise.filter(
    (h) => h.schritt === schritt && (!codes || codes.some((c) => h.code.startsWith(c))) && !(ohne ?? []).some((c) => h.code.startsWith(c)),
  );
  if (!hs.length) return null;
  return (
    <ul class="meldungen" data-testid={testid}>
      {hs.map((h) => (
        <li class={`meldung meldung--${h.stufe}`} key={`${h.code}|${h.pfad ?? ''}|${h.text}`}>
          {h.text}
        </li>
      ))}
    </ul>
  );
}

/** Fehlende Pflichtangaben eines Schritts (aus `Ergebnis.vollstaendigkeit`). */
export function Fehlend({ schritt }: { schritt: SchrittId }) {
  const f = store.ergebnis.value.vollstaendigkeit.filter((x) => x.schritt === schritt);
  if (!f.length) return null;
  return (
    <div class="fehlend" data-testid={`fehlend-${schritt}`}>
      <span class="fehlend__titel">Noch offen</span>
      <ul>
        {f.map((x) => (
          <li key={x.pfad + x.text}>{x.text}</li>
        ))}
      </ul>
    </div>
  );
}
