import type { ZusatzId } from '../../state/ui';
import { aktiveZusatz, geheZu, geheZuZusatz } from '../../state/ui';
import type { SchrittId } from '../schritte';

export const ZUSATZ: ReadonlyArray<{ id: ZusatzId; titel: string; zweck: string; inhalt: string }> = [
  { id: 'foerderung', titel: 'Förderung', zweck: 'Förderprogramme für den Heizungsersatz am Standort und ein geschätzter Förderbetrag.', inhalt: 'Programme nach Kanton und Massnahme, Schätzbetrag mit Quelle.' },
  { id: 'bewilligung', titel: 'Bewilligung', zweck: 'Bewilligungs- oder Meldepflicht für die Wärmepumpe nach Kanton.', inhalt: 'Kantonsregel für Luft/Wasser- und Erdsonden-WP, nötige Unterlagen.' },
  { id: 'offerte', titel: 'Offerte', zweck: 'Offerte aus Gerät, Speicher und Positionen — mit MwSt. und Netto nach Förderung.', inhalt: 'Paket, Positionen-Editor, Pre-Sales-Checks, MwSt., Netto nach Förderung, Offerten-PDF.' },
];

/** Navigation innerhalb der Zusatzmodule (Segmente) — getrennt von der Schrittfolge. */
function ZusatzNav({ aktiv }: { aktiv: ZusatzId }) {
  return (
    <div class="segment zusatz-nav" role="tablist" aria-label="Zusatzmodule">
      {ZUSATZ.map((z) => (
        <button type="button" role="tab" class="segment__knopf" aria-selected={z.id === aktiv} key={z.id} onClick={() => geheZuZusatz(z.id)} data-testid={`zusatz-tab-${z.id}`}>
          {z.titel}
        </button>
      ))}
    </div>
  );
}

/**
 * Zusatzmodule (Session 8: Platzhalter; Anbindung an State v3 und Ergebnis in Session 11). Eigene Seite mit eigener
 * Navigation, nicht Teil der Schrittfolge und ohne Status.
 */
export function ZusatzSeite({ zurueck }: { zurueck: { id: SchrittId; kurz: string } }) {
  const id = aktiveZusatz.value ?? 'foerderung';
  const z = ZUSATZ.find((x) => x.id === id)!;
  return (
    <section class="inhalt" aria-labelledby="schritt-titel" data-testid={`zusatz-${id}`}>
      <div class="inhalt__kopf">
        <span class="inhalt__nr inhalt__nr--zusatz" aria-hidden="true">
          +
        </span>
        <div>
          <h1 id="schritt-titel">{z.titel}</h1>
          <p>{z.zweck}</p>
        </div>
      </div>
      <ZusatzNav aktiv={id} />
      <div class="leerzustand" data-testid="zusatz-platzhalter">
        <span>
          Dieses Zusatzmodul wird in Session 11 an das Projekt angebunden ({z.inhalt}). Es liest dann Kanton, Massnahme, Gerät und Speicher aus
          denselben Angaben wie Dashboard und Bericht.
        </span>
      </div>
      <nav class="inhalt__nav" aria-label="Zurück zur Schrittfolge">
        <button type="button" class="btn" onClick={() => geheZu(zurueck.id)} data-testid="zusatz-zurueck">
          Zurück: {zurueck.kurz}
        </button>
      </nav>
    </section>
  );
}
