import type { BauteilArt, BauteilU, Stufen } from '../../kern/huelle';
import { stufenDefinition } from '../../kern/huelle';
import { daten } from '../bindung';
import { AuswahlFeld } from './Felder';
import { WertAnzeige } from './Herkunft';
import { zahl } from '../format';

interface Props {
  /** State-Pfad des Bauteiltyps (z. B. `huelle.bauteiltypen.aw`). */
  pfad: string;
  art: BauteilArt;
  baujahr: number;
  stufen: Stufen | undefined;
  /** Aufgelöster U-Wert aus dem Ergebnis. */
  ergebnis: BauteilU | undefined;
  testid: string;
}

/**
 * Stufen-Picker (Konzept des alten Tools, BEFUND §5), eingeklappt mit Klartext: Kopfzeile zeigt U, Herkunft und
 * die Begründung («geschätzt aus Baujahr 1965 …»). Aufgeklappt eine Auswahl je Stufe; leer = Epochen-Standard,
 * der als «Standard: …» sichtbar bleibt. Optionen und Standardwerte liefert der Kern (`stufenDefinition`),
 * den U-Wert das Ergebnis — die Komponente rechnet nichts.
 */
export function StufenPicker({ pfad, art, baujahr, stufen, ergebnis, testid }: Props) {
  const defs = stufenDefinition(art, baujahr, stufen ?? {}, daten.huelle);
  const bekannt = ergebnis?.stufenBekannt.length ?? 0;
  return (
    <details class="picker" data-testid={testid}>
      <summary class="picker__kopf">
        <span class="picker__u">
          <WertAnzeige wert={ergebnis?.u ?? null} text={zahl(ergebnis?.u.wert, 'W/m²K', 2)} testid={`${testid}-u`} />
        </span>
        <span class="picker__klartext" data-testid={`${testid}-klartext`}>
          {ergebnis ? ergebnis.u.begruendung : 'Baujahr fehlt — kein Aufbau bestimmbar'}
        </span>
        <span class="picker__aufklappen">{bekannt ? `${bekannt} von ${defs.length} Angaben bekannt` : 'Aufbau angeben'}</span>
      </summary>
      <div class="picker__stufen">
        {defs.map((d) => (
          <AuswahlFeld
            key={d.key}
            pfad={`${pfad}.stufen.${d.key}`}
            label={d.label}
            optionen={d.options.map((o) => ({ wert: o.value, label: o.label }))}
            standardText={d.standardLabel}
            testid={`${testid}-${d.key}`}
          />
        ))}
      </div>
    </details>
  );
}
