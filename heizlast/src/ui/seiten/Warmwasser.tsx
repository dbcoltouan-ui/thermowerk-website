import { rel, store } from '../bindung';
import { Abschnitt, JaNeinFeld, Raster, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { kW, zahl } from '../format';
import { WwAngaben } from './WwAngaben';

/**
 * Schritt 5 — Warmwasser künftig (befund_ux-datenfluss §5.1): «Bereitet die neue WP Warmwasser?» ja → Bedarf
 * (Personen oder Liter pro Tag), Verluste, Ladetemperatur → ΔT; nein → nur Hinweis. Eigener Ast, keine Kopplung mit dem
 * Verbrauchsabzug aus Schritt 3 (UX-11/13). Werte, Standardwerte und Q_w kommen aus dem Ergebnis.
 */
export function Warmwasser() {
  const s = store.state.value;
  const e = store.ergebnis.value;
  const w = s.warmwasser;
  const sp = e.speicher.ww;
  const zu = e.warmwasser.zuschlag;
  const abzugBisher = s.methode === 'fws' && s.verbrauch.quelle === 'rechnungen' && s.verbrauch.wwBisher === true;
  return (
    <>
      <Fehlend schritt="warmwasser" />
      <Abschnitt titel="Warmwasser über die Wärmepumpe">
        <JaNeinFeld
          pfad="warmwasser.wwKuenftig"
          label="Bereitet die neue Wärmepumpe Warmwasser?"
          testid="ww-kuenftig"
          info="Ja: Warmwasser wird über die Heizungs-WP geladen — daraus folgen Leistungszuschlag Q_w und Warmwasserspeicher. Nein: Warmwasser separat (z. B. Wärmepumpen-Boiler), dann kein Zuschlag und kein Speicher in dieser Auslegung."
        />
        {w.wwKuenftig === false && (
          <p class="zeile-info" data-testid="ww-separat">
            Warmwasser separat (z. B. Wärmepumpen-Boiler): kein Leistungszuschlag Q<sub>w</sub>, kein Warmwasserspeicher in Schritt 8.
            {abzugBisher ? ' Der bisherige Warmwasser-Anteil wird in Schritt 3 vom Verbrauch abgezogen — das bleibt davon unberührt.' : ''}
          </p>
        )}
      </Abschnitt>

      {rel('warmwasser.methode') && (
        <Abschnitt titel="Bedarf und Verluste" text="Nutzwarmwasser bei 60 °C nach SIA 385/2; Verluste werden zum Nutzbedarf addiert (FWS Folie 49).">
          <WwAngaben basis="warmwasser" ergebnis={e.warmwasser.kuenftig} testid="wwk" />
        </Abschnitt>
      )}

      {rel('warmwasser.tLadeC') && (
        <Abschnitt titel="Ladung und Leistungszuschlag" text="Die Ladetemperatur bestimmt die Temperaturdifferenz im Speicher (ΔT = T_Lade − 10 °C Kaltwasser) und damit das Speichervolumen.">
          <Raster>
            <ZahlFeld pfad="warmwasser.tLadeC" label="Ladetemperatur Speicher" einheit="°C" min={40} max={80} dez={0} standard={sp?.tLade} testid="ww-tlade" info="Übliche Ladetemperatur EFH 60 °C (FWS Folie 57). Höhere Ladetemperaturen erhöhen den Vorlauf, mit dem die WP Warmwasser bereitet." />
            <div class="feld feld--wert">
              <span class="feld__label">Temperaturdifferenz ΔT</span>
              <WertAnzeige wert={sp?.deltaT} text={zahl(sp?.deltaT.wert, 'K')} testid="ww-deltat" />
            </div>
          </Raster>
          {zu && (
            <dl class="faktenliste" data-testid="ww-zuschlag">
              <div>
                <dt>Ladezeit pro Tag t<sub>d</sub></dt>
                <dd><WertAnzeige wert={zu.td} text={zahl(zu.td.wert, 'h', 2)} testid="ww-td" /></dd>
              </div>
              <div>
                <dt>Leistungszuschlag Q<sub>w</sub></dt>
                <dd><WertAnzeige wert={zu.qw} text={kW(zu.qw.wert)} testid="ww-qw" /></dd>
              </div>
            </dl>
          )}
          {!zu && <p class="zeile-info">Der Leistungszuschlag Q<sub>w</sub> folgt, sobald die Heizlast (Schritt 4) feststeht.</p>}
        </Abschnitt>
      )}
      <Meldungen schritt="warmwasser" testid="ww-meldungen" />
    </>
  );
}
