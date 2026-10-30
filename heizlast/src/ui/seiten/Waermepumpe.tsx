import type { Wert } from '../../kern/wert';
import { fmt } from '../../kern/wert';
import { daten, lese, setze, store } from '../bindung';
import { Abschnitt, AuswahlFeld, Raster, SegmentFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { Skala } from '../komponenten/Skala';
import { kW, zahl } from '../format';

const G = daten.fws.geraetewahl;
/** Filtertoleranz als sichtbarer Standardwert (dieselbe Zahl nimmt der Kern ohne Angabe). */
const TOLERANZ_STD: Wert = { wert: G.filterToleranzUntenProzent, einheit: '%', herkunft: 'fallback', stufe: 'standardwert', begruendung: `Filter: WP bis ${fmt(G.filterToleranzUntenProzent, 0)} % kleiner als Q_h zugelassen (Standardwert, Spitze über Elektroeinsatz)`, quelle: 'fws.json geraetewahl (Thermowerk-Annahme)' };
/** Hinweis-Codes, die bei der Liste stehen bzw. schon am Feld (eigener Pfad) erscheinen. */
const LISTE_CODES = ['geraet.keineTreffer', 'geraet.qhFehlt', 'geraet.quelleNichtInDb'];
const FELD_CODES = ['geraet.filterVorlaufZuTief', 'geraet.kennlinie', 'geraet.auslegungUeberNenn'];
const AMPEL_TEXT = { gruen: 'passt', gelb: 'knapp/gross', rot: 'passt nicht', grau: '—' } as const;

/** Woher der Filter-Vorlauf kommt — Klartext aus dem Ergebnis (keine eigene Rechnung). */
function vorlaufHerkunft(): string {
  const e = store.ergebnis.value;
  const std = e.geraet.filterVorlaufStandard;
  if (!std) return '';
  if (std !== e.auslegungsVL) return `aus der Warmwasser-Ladetemperatur (höher als der Heizungs-Vorlauf ${zahl(e.auslegungsVL.wert, '°C', 1)})`;
  const g = e.waermeabgabe?.gebaeude;
  if (e.auslegungsVL.stufe === 'heizflaechen' && g?.massgebenderRaum) return `aus Heizflächen, max. Raum: ${g.massgebenderRaum.name}`;
  if (e.auslegungsVL.stufe === 'heizkreis') return 'höchster Heizkreis-Vorlauf (Schritt 6)';
  if (e.auslegungsVL.herkunft === 'override') return 'Auslegungs-Vorlauf manuell (Schritt 6)';
  return 'Standardwert des Wärmeabgabesystems (Schritt 6) — mit erfassten Heizflächen genauer';
}

function Filter() {
  const e = store.ergebnis.value;
  const ge = e.geraet;
  return (
    <Abschnitt titel="Filter" text="Die Liste zeigt Geräte, deren Leistung zu Q_h passt und deren maximaler Vorlauf reicht. Vorlauf und Leistung kommen aus den Schritten 6 und 7." testid="wp-filter">
      <SegmentFeld pfad="geraet.quelle" label="Wärmequelle" optionen={[{ wert: 'luftWasser', label: 'Luft/Wasser' }, { wert: 'soleWasser', label: 'Sole/Wasser' }, { wert: 'wasserWasser', label: 'Wasser/Wasser' }]} testid="wp-quelle" />
      <Raster>
        <div class="hf__mass">
          <ZahlFeld pfad="geraet.filterOverrides.vorlaufC" label="Vorlauf für den Filter" einheit="°C" min={25} max={80} dez={1} standard={ge.filterVorlaufStandard} zuruecksetzenText="Auslegungs-VL verwenden" testid="wp-vorlauf" />
          <span class="zeile-info zeile-info--klein" data-testid="wp-vorlauf-herkunft">
            {lese('geraet.filterOverrides.vorlaufC') === undefined ? vorlaufHerkunft() : 'eigene Angabe'}
          </span>
        </div>
        <div class="feld feld--wert">
          <span class="feld__label">Auslegungsleistung Q<sub>h</sub></span>
          <WertAnzeige wert={e.zuschlaege.qh} text={kW(e.zuschlaege.qh?.wert)} testid="wp-qh" />
          {ge.qWpMin !== null && ge.qWpMax !== null && (
            <span class="zeile-info zeile-info--klein" data-testid="wp-bereich">
              gesucht: Q<sub>WP</sub> {fmt(ge.qWpMin / 1000, 1)}–{fmt(ge.qWpMax / 1000, 1)} kW (A−7/W35)
            </span>
          )}
        </div>
      </Raster>
      <details class="genauer">
        <summary>Weitere Filter</summary>
        <Raster spalten={3}>
          <ZahlFeld pfad="geraet.filterOverrides.toleranzUntenProzent" label="WP darf kleiner sein um" einheit="%" min={0} max={30} dez={0} standard={TOLERANZ_STD} testid="wp-toleranz" />
          <AuswahlFeld pfad="geraet.filterOverrides.aufstellung" label="Aufstellung" optionen={[{ wert: 'aussen', label: 'aussen' }, { wert: 'innen', label: 'innen' }]} leerText="— egal —" testid="wp-aufstellung" />
          <ZahlFeld pfad="geraet.filterOverrides.schallNachtMaxDb" label="Schall nachts max." einheit="dB(A)" min={20} max={80} dez={0} testid="wp-schall" />
        </Raster>
      </details>
    </Abschnitt>
  );
}

function Liste() {
  const e = store.ergebnis.value;
  const ge = e.geraet;
  const auswahl = store.state.value.geraet.auswahlId;
  return (
    <Abschnitt titel="Passende Geräte" text={ge.liste.length ? `${ge.liste.length} Geräte aus der Datenbank, sortiert nach Nähe zu Q_h. Leistung bei A−7/W35 (Datenbank).` : undefined} testid="wp-liste">
      {ge.liste.length === 0 ? (
        !e.zuschlaege.qh && (
          <p class="leerzustand" data-testid="wp-liste-leer">
            Ohne Auslegungsleistung Q<sub>h</sub> keine Geräteauswahl (Schritte 1–4 und 7).
          </p>
        )
      ) : (
        <div class="tabelle-rahmen">
          <table class="tabelle geraete">
            <thead>
              <tr>
                <th>Gerät</th>
                <th class="zahl">Q<sub>WP</sub></th>
                <th class="zahl nur-breit">VL max.</th>
                <th class="zahl">Grösse</th>
                <th class="zahl nur-breit">Preis</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ge.liste.map((g) => (
                <tr key={g.id} class={g.id === auswahl ? 'geraete__gewaehlt' : undefined} data-testid={`geraet-${g.id}`}>
                  <td>
                    {g.bezeichnung}
                    {g.unplausibel && <span class="badge badge--warn" title="Datenbank-Werte unplausibel — Datenblatt prüfen"> prüfen</span>}
                  </td>
                  <td class="zahl">{kW(g.qWpW, 1)}</td>
                  <td class="zahl nur-breit">{zahl(g.vorlaufMaxC, '°C')}</td>
                  <td class="zahl">
                    <span class={`ampel-punkt ampel-punkt--${g.ampel}`} aria-hidden="true" /> {g.uebergroesseProzent > 0 ? '+' : ''}
                    {fmt(g.uebergroesseProzent, 0)} %<span class="visually-hidden"> ({AMPEL_TEXT[g.ampel]})</span>
                  </td>
                  <td class="zahl nur-breit">{g.preisChf === null ? 'auf Anfrage' : `CHF ${fmt(g.preisChf, 0)}`}</td>
                  <td>
                    {g.id === auswahl ? (
                      <span class="badge badge--brand">gewählt</span>
                    ) : (
                      <button type="button" class="btn btn--klein" onClick={() => setze('geraet.auswahlId', g.id)} data-testid={`geraet-${g.id}-waehlen`}>
                        Wählen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Meldungen schritt="waermepumpe" codes={LISTE_CODES} />
    </Abschnitt>
  );
}

function Gewaehlt() {
  const e = store.ergebnis.value;
  const g = e.geraet.gewaehlt;
  if (!g) return null;
  const b = g.bivalenz;
  const mod = g.modulation;
  return (
    <Abschnitt
      titel={g.bezeichnung}
      text="Gewähltes Gerät — Grösse gegenüber Q_h als Skala (grün: Kurs-Faustregel Q_h ≥ 0.75 · Q_WP), Bivalenz nach FWS Folie 95."
      testid="wp-gewaehlt"
      aktion={
        <button type="button" class="link-knopf link-knopf--gefahr" onClick={() => setze('geraet.auswahlId', null)} data-testid="wp-abwaehlen">
          Auswahl aufheben
        </button>
      }
    >
      <Raster>
        <div class="feld feld--wert">
          <span class="feld__label">Heizleistung laut Datenbank</span>
          <WertAnzeige wert={g.qWp} text={kW(g.qWp.wert)} testid="wp-qwp-db" immerChip />
        </div>
        <ZahlFeld pfad="geraet.qWpAuslegungW" label="Heizleistung am Auslegungspunkt" einheit="kW" faktor={1000} min={0.5} max={200} dez={2} standard={g.qWp} zuruecksetzenText="Datenbankwert verwenden" testid="wp-qwp-auslegung" info={`Leistung des Geräts bei θe ${zahl(e.thetaE.wert, '°C', 0)} und Vorlauf ${zahl(e.auslegungsVL.wert, '°C', 0)} laut Datenblatt (FWS Folie 93). Die Datenbank kennt nur A−7/W35.`} />
      </Raster>
      <Skala skala={e.skalen.wpGroesse} text={g.dimensionierung.text} testid="wp-skala" />
      <dl class="leistung__fakten wp-fakten">
        <div>
          <dt>Leistungsanteil an Q<sub>h</sub></dt>
          <dd><WertAnzeige wert={b.leistungsanteil} text={`${fmt(b.leistungsanteil.wert * 100, 0)} %`} testid="wp-leistungsanteil" /></dd>
        </div>
        <div>
          <dt>Energieanteil WP (Bivalenz)</dt>
          <dd data-testid="wp-bivalenz">{b.energieanteil ? <WertAnzeige wert={b.energieanteil} text={b.monovalent ? '100 % (monovalent)' : b.energieanteil.band ? `${fmt(b.energieanteil.band[0] * 100, 0)}–${fmt(b.energieanteil.band[1] * 100, 0)} %` : `${fmt(b.energieanteil.wert * 100, 0)} %`} /> : b.text}</dd>
        </div>
        {g.vorlaufMax && (
          <div>
            <dt>Vorlauf max.</dt>
            <dd><WertAnzeige wert={g.vorlaufMax} text={zahl(g.vorlaufMax.wert, '°C')} /></dd>
          </div>
        )}
        {g.mindestPuffer && (
          <div>
            <dt>Mindest-Puffer Hersteller</dt>
            <dd><WertAnzeige wert={g.mindestPuffer} text={zahl(g.mindestPuffer.wert, 'l')} /></dd>
          </div>
        )}
        <div>
          <dt>Modulation</dt>
          <dd data-testid="wp-modulation">
            {mod ? (
              <>
                {kW(mod.minW.wert, 1)} – {kW(mod.maxW.wert, 1)}
                {mod.anteilMinAnQh && <span class="mute"> · untere Grenze {fmt(mod.anteilMinAnQh.wert * 100, 0)} % von Q<sub>h</sub></span>}
              </>
            ) : (
              <span class="mute">nicht in der Datenbank — Datenblatt</span>
            )}
          </dd>
        </div>
      </dl>
      <p class="zeile-info" data-testid="wp-jaz">
        Jahresarbeitszahl: hier bewusst nicht geschätzt — es gibt keine belegte Kurzformel für Schweizer Verhältnisse, und die Datenbank kennt den COP nur bei W35. Für eine JAZ-Angabe das Rechentool WPesti (FWS) oder die Herstellersoftware verwenden.
      </p>
      <Meldungen schritt="waermepumpe" ohne={[...LISTE_CODES, ...FELD_CODES]} testid="wp-meldungen" />
    </Abschnitt>
  );
}

/** Schritt 9 — Wärmepumpe: Filter (Auslegungs-VL aus Schritt 6, Q_h aus Schritt 7), Liste aus dem Ergebnis, Auswahl mit Skala, Bivalenz, Modulation. */
export function Waermepumpe() {
  return (
    <>
      <Fehlend schritt="waermepumpe" />
      <Filter />
      <Gewaehlt />
      <Liste />
    </>
  );
}
