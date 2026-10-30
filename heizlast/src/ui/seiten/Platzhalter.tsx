import type { SchrittDef } from '../schritte';

const SESSION: Record<string, string> = {
  bericht: 'Session 9',
};

/** Platzhalter für Schritte, die in späteren Sessions gebaut werden. */
export function Platzhalter({ schritt }: { schritt: SchrittDef }) {
  return (
    <p class="leerzustand">
      Dieser Schritt folgt in {SESSION[schritt.id] ?? 'einer späteren Session'}. Bis dahin rechnet das Dashboard mit den
      Standardwerten des Kerns.
    </p>
  );
}
