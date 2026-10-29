import { stationenListe } from '../../kern/klima';
import { daten, rel, store } from '../bindung';
import { AuswahlFeld, Abschnitt, JaNeinFeld, Raster, SegmentFeld, TextFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { zahl } from '../format';

const KANTONE = Object.keys(daten.klima.zuordnung.kanton).sort();
const STATIONEN = stationenListe(daten.klima).map((st) => ({ wert: st.key, label: `${st.name} (${st.kanton}, ${st.hoeheM} m)` }));
const STUFE_TEXT = { override: 'gewählt', plz3: 'aus PLZ', plz2: 'aus PLZ-Region', kanton: 'aus Kanton' } as const;

/** Schritt 1 — Gebäude: Typ, Standort → Klimastation, Baujahr, Geschosse, Keller/Dach (raumweise), EBF. */
export function Gebaeude() {
  const e = store.ergebnis.value;
  const g = store.state.value.gebaeude;
  const k = e.klima;
  return (
    <>
      <Fehlend schritt="gebaeude" />
      <Abschnitt titel="Gebäude">
        <SegmentFeld pfad="gebaeude.typ" label="Gebäudetyp" optionen={[{ wert: 'efh', label: 'Einfamilienhaus' }, { wert: 'mfh', label: 'Mehrfamilienhaus' }]} testid="gebaeude-typ" />
        <Raster spalten={3}>
          <ZahlFeld pfad="gebaeude.baujahr" label="Baujahr" min={1800} max={2100} ganz testid="gebaeude-baujahr" info="Bestimmt die Bauperiode (Vergleichswerte W/m²) und im raumweisen Modus die geschätzten Bauteilaufbauten." />
          <ZahlFeld pfad="gebaeude.geschosse" label="Beheizte Geschosse" min={1} max={40} ganz testid="gebaeude-geschosse" />
          {g.typ === 'mfh' && <ZahlFeld pfad="gebaeude.wohneinheiten" label="Wohneinheiten" min={1} max={500} ganz testid="gebaeude-wohneinheiten" />}
        </Raster>
        <AuswahlFeld
          pfad="gebaeude.energiestandard"
          label="Energiestandard"
          optionen={[{ wert: 'keiner', label: 'Kein Label' }, { wert: 'minergie', label: 'Minergie' }, { wert: 'minergieP', label: 'Minergie-P' }]}
          testid="gebaeude-energiestandard"
          info="Nur für die Plausibilisierung der spezifischen Heizlast (W/m²)."
        />
      </Abschnitt>

      <Abschnitt titel="Standort und Aussentemperatur" text="Aus PLZ oder Kanton wird die nächste Klimastation nach SIA 2028 gewählt; die Höhe korrigiert die Auslegungstemperatur.">
        <Raster spalten={4}>
          <TextFeld pfad="gebaeude.standort.plz" label="PLZ" muster={/^\d{4}$/} musterText="Vierstellige PLZ eingeben." testid="standort-plz" />
          <TextFeld pfad="gebaeude.standort.ort" label="Ort" testid="standort-ort" />
          <AuswahlFeld pfad="gebaeude.standort.kanton" label="Kanton" optionen={KANTONE.map((x) => ({ wert: x, label: x }))} leerText="—" testid="standort-kanton" />
          <ZahlFeld pfad="gebaeude.standort.hoeheM" label="Höhe" einheit="m ü. M." min={0} max={4000} ganz testid="standort-hoehe" />
        </Raster>
        <Raster>
          <AuswahlFeld
            pfad="gebaeude.standort.stationOverride"
            label="Klimastation"
            optionen={STATIONEN}
            standardText={k?.station ? `${k.station.name} (${k.stationsStufe ? STUFE_TEXT[k.stationsStufe] : 'automatisch'})` : undefined}
            leerText="— aus PLZ/Kanton —"
            testid="standort-station"
          />
          <ZahlFeld pfad="gebaeude.standort.thetaEOverrideC" label={<>Auslegungs-Aussentemperatur θ<sub>e</sub></>} einheit="°C" min={-30} max={10} dez={1} standard={e.thetaE} testid="standort-thetae" info="Ohne Standort gilt −8 °C als Standardwert. Mit Station gilt deren Wert (mit Höhenkorrektur). Eine eigene Angabe überschreibt beides." />
        </Raster>
        {k?.station && (
          <p class="zeile-info" data-testid="klima-bezeichnung">
            {k.bezeichnung}
            {k.hgt && <> — Heizgradtage {zahl(k.hgt.wert, 'Kd')}</>}
          </p>
        )}
        <Meldungen schritt="gebaeude" codes={['klima.']} testid="klima-meldungen" />
      </Abschnitt>

      {(rel('gebaeude.keller') || rel('gebaeude.dachform')) && (
        <Abschnitt titel="Keller und Dach" text="Bestimmt, welche Bauteiltypen die Hülle vorschlägt (Boden gegen Keller oder Erdreich, Dach oder Estrichdecke).">
          <SegmentFeld pfad="gebaeude.keller" label="Keller" optionen={[{ wert: 'unbeheizt', label: 'unbeheizt' }, { wert: 'beheizt', label: 'beheizt' }, { wert: 'keiner', label: 'kein Keller' }]} testid="gebaeude-keller" />
          <SegmentFeld pfad="gebaeude.dachform" label="Dachform" optionen={[{ wert: 'steil', label: 'Steildach' }, { wert: 'flach', label: 'Flachdach' }]} testid="gebaeude-dachform" />
          {rel('gebaeude.dachraumBeheizt') && <JaNeinFeld pfad="gebaeude.dachraumBeheizt" label="Ist der Dachraum beheizt?" jaText="Ja, Dach ist Hülle" neinText="Nein, Estrich unbeheizt" testid="gebaeude-dachraum" />}
        </Abschnitt>
      )}

      <Abschnitt titel="Energiebezugsfläche (EBF)" text="Aus den erfassten Räumen (Nettofläche × Wandanteil) oder als eigene Angabe.">
        <SegmentFeld pfad="gebaeude.ebfModus" label="EBF bestimmen" optionen={[{ wert: 'raeume', label: 'aus Räumen' }, { wert: 'manuell', label: 'eigene Angabe' }]} testid="ebf-modus" />
        {rel('gebaeude.ebfManuellM2') && <ZahlFeld pfad="gebaeude.ebfManuellM2" label="EBF" einheit="m²" min={1} max={100000} dez={1} testid="ebf-manuell" />}
        <div class="ergebniszeile">
          <span>EBF für die Rechnung</span>
          <WertAnzeige wert={e.ebf} text={zahl(e.ebf?.wert, 'm²', 1)} testid="ebf-wert" immerChip />
        </div>
      </Abschnitt>
    </>
  );
}
