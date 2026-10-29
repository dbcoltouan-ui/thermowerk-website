import type { SchrittDef } from '../schritte';

const SESSION: Record<string, string> = {
  gebaeude: 'Session 7',
  sanierungen: 'Session 7',
  verbrauch: 'Session 7',
  huelle: 'Session 7',
  heizlast: 'Session 7',
  warmwasser: 'Session 8',
  waermeabgabe: 'Session 8',
  zuschlaege: 'Session 8',
  speicher: 'Session 8',
  waermepumpe: 'Session 8',
  bericht: 'Session 9',
};

/** Platzhalter für noch nicht gebaute Schritte. */
export function Platzhalter({ schritt }: { schritt: SchrittDef }) {
  return (
    <div class="karte">
      <p class="mute">
        Dieser Schritt wird in {SESSION[schritt.id] ?? 'einer späteren Session'} gebaut.
      </p>
    </div>
  );
}
