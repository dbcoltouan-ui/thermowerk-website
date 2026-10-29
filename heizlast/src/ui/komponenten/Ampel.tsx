import type { Ampel as AmpelFarbe } from '../../kern/typen';
import { Popover } from './Popover';

const FARB_TEXT: Record<AmpelFarbe, string> = { gruen: 'grün', gelb: 'gelb', rot: 'rot', grau: 'nicht beurteilbar' };

interface Props {
  ampel: AmpelFarbe;
  text: string;
  /** Bedeutung der Farben (Schwellen) — erscheint per Klick. */
  legende: ReadonlyArray<{ ampel: AmpelFarbe; text: string }>;
  testid?: string;
}

/** Ampel mit Klartext und Legende; die Farbe kommt aus dem Ergebnis, die Komponente bewertet nichts selbst. */
export function Ampel({ ampel, text, legende, testid }: Props) {
  return (
    <span class={`ampel ampel--${ampel}`} data-testid={testid} data-ampel={ampel}>
      <span class="ampel__punkt" aria-hidden="true" />
      <span class="ampel__text">
        <span class="visually-hidden">Ampel {FARB_TEXT[ampel]}: </span>
        {text}
      </span>
      <Popover knopf="Legende" label="Legende der Ampel" knopfKlasse="link-knopf" ausrichtung="rechts">
        <span class="legende">
          {legende.map((l) => (
            <span class={`legende__zeile ampel--${l.ampel}`} key={l.ampel + l.text}>
              <span class="ampel__punkt" aria-hidden="true" />
              {l.text}
            </span>
          ))}
        </span>
      </Popover>
    </span>
  );
}
