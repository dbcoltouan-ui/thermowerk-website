import type { WarmwasserErgebnis } from '../../kern/warmwasser';
import type { Wert } from '../../kern/wert';
import { daten, rel } from '../bindung';
import { AuswahlFeld, Raster, SegmentFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { zahl } from '../format';

const WW = daten.fws.warmwasser;
const BEDARF = WW.bedarfProPersonLiterTag.werte.map((w) => ({ wert: w.key, label: `${w.gebaeudeart}, ${w.standard} (${w.literProPersonTag} l/P·d)` }));
const BEDARF_STANDARD = WW.bedarfProPersonLiterTag.werte.find((w) => w.default);

/** Prozent-Richtwerte der Daten als sichtbarer Standardwert (dieselben Zahlen verwendet der Kern ohne Angabe). */
function richtwert(typ: number, hinweis: string | undefined): Wert {
  return { wert: typ, einheit: '%', herkunft: 'tabelle', begruendung: hinweis ?? `Richtwert ${typ} %`, quelle: 'FWS M3 Folien 45/46' };
}
const SPEICHER_STD = richtwert(WW.verluste.speicher.ohneVolumen.typ, WW.verluste.speicher.ohneVolumen.hinweis);
const AUSSTOSS_STD = richtwert(WW.verluste.ausstoss.typ, WW.verluste.ausstoss.hinweis);

const ZIRK = [
  { wert: 'keine', label: 'keine Zirkulation' },
  { wert: 'rohrAnRohr', label: 'Zirkulation Rohr an Rohr' },
  { wert: 'separat', label: 'Zirkulation separat geführt' },
  { wert: 'warmhalteband', label: 'Warmhalteband' },
  { wert: 'unbekannt', label: 'unbekannt' },
] as const;

/**
 * Warmwasser-Angaben für einen Ast (`verbrauch.abzug` = bisher über die Heizung, `warmwasser` = künftig über die WP).
 * Beide Äste haben dasselbe Schema, aber eigene Felder — keine stille Kopplung (UX-11/13).
 */
export function WwAngaben({ basis, ergebnis, testid }: { basis: 'verbrauch.abzug' | 'warmwasser'; ergebnis: WarmwasserErgebnis | null; testid: string }) {
  return (
    <div class="unterblock" data-testid={testid}>
      <SegmentFeld pfad={`${basis}.methode`} label="Bedarf bestimmen über" optionen={[{ wert: 'personen', label: 'Personen' }, { wert: 'direkt', label: 'Liter pro Tag' }]} testid={`${testid}-methode`} />
      <Raster>
        {rel(`${basis}.personen`) && <ZahlFeld pfad={`${basis}.personen`} label="Personen" min={1} max={500} testid={`${testid}-personen`} />}
        {rel(`${basis}.bedarfKey`) && (
          <AuswahlFeld pfad={`${basis}.bedarfKey`} label="Bedarf je Person" optionen={BEDARF} standardText={BEDARF_STANDARD ? `${BEDARF_STANDARD.literProPersonTag} l/P·d` : undefined} testid={`${testid}-bedarf`} info="Nutzwarmwasser nach SIA 385/2 (60 °C). Standard 45 l pro Person und Tag." />
        )}
        {rel(`${basis}.vwuLiterTag`) && <ZahlFeld pfad={`${basis}.vwuLiterTag`} label="Nutzwarmwasser" einheit="l/d" min={1} max={100000} testid={`${testid}-vwu`} info="Warmwasserbedarf bei 60 °C pro Tag." />}
      </Raster>
      <details class="genauer">
        <summary>Verluste genauer angeben</summary>
        <Raster>
          <ZahlFeld pfad={`${basis}.speicherverlustProzent`} label="Speicherverlust" einheit="%" min={0} max={50} standard={SPEICHER_STD} testid={`${testid}-speicherverlust`} />
          <ZahlFeld pfad={`${basis}.ausstossProzent`} label="Ausstossverlust" einheit="%" min={0} max={50} standard={AUSSTOSS_STD} testid={`${testid}-ausstoss`} />
          <AuswahlFeld pfad={`${basis}.zirkulation`} label="Zirkulation" optionen={ZIRK} testid={`${testid}-zirkulation`} />
          {rel(`${basis}.zirkulationLaengeM`) && <ZahlFeld pfad={`${basis}.zirkulationLaengeM`} label="Länge warmgehaltene Leitung" einheit="m" min={0} max={1000} testid={`${testid}-zirklaenge`} />}
        </Raster>
      </details>
      {ergebnis && (
        <div class="ergebniszeile">
          <span>Warmwasser-Wärmebedarf</span>
          <span class="ergebniszeile__werte">
            <WertAnzeige wert={ergebnis.qww} text={zahl(ergebnis.qww.wert, 'kWh/d', 1)} testid={`${testid}-qww`} />
            <WertAnzeige wert={ergebnis.qnWw} text={zahl(ergebnis.qnWw.wert, 'kWh/a')} testid={`${testid}-qnww`} />
          </span>
        </div>
      )}
    </div>
  );
}
