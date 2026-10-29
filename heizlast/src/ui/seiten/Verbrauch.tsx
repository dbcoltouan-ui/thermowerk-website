import type { VerbrauchsEintrag } from '../../kern/fws';
import { etaPresetsFuer } from '../../kern/fws';
import type { Energietraeger } from '../../kern/typen';
import { ENERGIETRAEGER } from '../../kern/typen';
import { fmt } from '../../kern/wert';
import { daten, lese, rel, setze, store } from '../bindung';
import { Ampel } from '../komponenten/Ampel';
import { Abschnitt, AuswahlFeld, JaNeinFeld, OptionKarten, Raster, SegmentFeld, TextFeld, ZahlFeld } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { kW, zahl } from '../format';
import { WwAngaben } from './WwAngaben';

const QUELLEN = [
  { wert: 'rechnungen', label: 'Energierechnungen vorhanden', text: 'Öl, Gas, Holz, Strom oder Fernwärme — idealerweise drei Heizperioden. Jahreswerte werden je Energieträger gemittelt.' },
  { wert: 'wpBetriebsstunden', label: 'Bestehende Wärmepumpe', text: 'Betriebsstundenzähler mit Nennleistung oder Stromverbrauch mit COP.' },
  { wert: 'messung', label: 'Wärmezähler', text: 'Gemessene Heizwärme in kWh pro Jahr.' },
  { wert: 'keine', label: 'Keine Verbrauchsdaten', text: 'Grobe Schätzung aus Bauperiode und EBF — als Schätzung mit Spanne markiert.' },
] as const;

const STREUUNG = daten.fws.verbrauch.streuung;

function traegerInfo(t: Energietraeger) {
  const konv = store.state.value.verbrauch.konvention;
  return daten.fws.heizwerte.konventionen[konv]?.traeger[t];
}

function EintragZeile({ eintrag, nr }: { eintrag: VerbrauchsEintrag & { id: string }; nr: number }) {
  const p = `verbrauch.eintraege.${eintrag.id}`;
  const mitZeitraum = eintrag.jahr === undefined && (eintrag.von !== undefined || eintrag.bis !== undefined);
  const info = traegerInfo(eintrag.energietraeger);
  return (
    <div class="raster-zeile" data-testid={`eintrag-${nr}`}>
      <AuswahlFeld pfad={`${p}.energietraeger`} label="Energieträger" optionen={ENERGIETRAEGER.map((t) => ({ wert: t, label: traegerInfo(t)?.label ?? t }))} testid={`eintrag-${nr}-traeger`} beiWahl={(w) => w && setze(`${p}.energietraeger`, w)} />
      <div class="feld">
        <div class="feld__kopf">
          <span class="feld__label">Zeitraum</span>
          <button
            type="button"
            class="link-knopf"
            data-testid={`eintrag-${nr}-zeitraum-umschalten`}
            onClick={() =>
              store.aktion((s) => ({
                ...s,
                verbrauch: {
                  ...s.verbrauch,
                  eintraege: s.verbrauch.eintraege.map((x) => {
                    if (x.id !== eintrag.id) return x;
                    const { jahr: _j, von: _v, bis: _b, ...rest } = x;
                    return mitZeitraum ? { ...rest, jahr: new Date().getFullYear() - 1 } : rest;
                  }),
                },
              }))
            }
          >
            {mitZeitraum ? 'Kalenderjahr' : 'von–bis'}
          </button>
        </div>
        {mitZeitraum ? (
          <div class="paar">
            <TextFeld pfad={`${p}.von`} label="von" platzhalter="2022-06-01" muster={/^\d{4}-\d{2}(-\d{2})?$/} musterText="Datum als JJJJ-MM-TT." testid={`eintrag-${nr}-von`} />
            <TextFeld pfad={`${p}.bis`} label="bis" platzhalter="2023-05-31" muster={/^\d{4}-\d{2}(-\d{2})?$/} musterText="Datum als JJJJ-MM-TT." testid={`eintrag-${nr}-bis`} />
          </div>
        ) : (
          <ZahlFeld pfad={`${p}.jahr`} label="Jahr" min={1980} max={2100} ganz testid={`eintrag-${nr}-jahr`} />
        )}
      </div>
      <ZahlFeld pfad={`${p}.menge`} label="Menge" einheit={info?.einheit ?? ''} min={0} testid={`eintrag-${nr}-menge`} />
      {store.state.value.verbrauch.klimabereinigung && <ZahlFeld pfad={`${p}.hgtIstKd`} label="Heizgradtage des Zeitraums" einheit="Kd" min={0} max={8000} ganz testid={`eintrag-${nr}-hgt`} />}
      <button type="button" class="link-knopf link-knopf--gefahr raster-zeile__weg" onClick={() => setze(p, undefined)} aria-label={`Eintrag ${nr} entfernen`} data-testid={`eintrag-${nr}-entfernen`}>
        Entfernen
      </button>
    </div>
  );
}

function Rechnungen() {
  const s = store.state.value;
  const fws = store.ergebnis.value.heizlast.fws;
  const v = s.verbrauch;
  const traeger = [...new Set(v.eintraege.map((x) => x.energietraeger))];
  const naechstes = (): Record<string, unknown> => {
    const letzt = v.eintraege[v.eintraege.length - 1];
    const jahr = letzt?.jahr !== undefined ? letzt.jahr - 1 : new Date().getFullYear() - 1;
    return { energietraeger: letzt?.energietraeger ?? 'heizoel', jahr };
  };
  return (
    <>
      <Abschnitt
        titel="Jahresraster"
        text="Je Zeile ein Kalenderjahr oder ein Zeitraum (Öl: von Tankfüllung zu Tankfüllung). Gleicher Energieträger in überlappenden Zeiträumen ist nicht zulässig."
        aktion={
          <button type="button" class="btn" onClick={() => store.hinzufuegen('verbrauch.eintraege', naechstes(), 'v')} data-testid="eintrag-neu">
            Eintrag hinzufügen
          </button>
        }
      >
        {v.eintraege.length === 0 ? (
          <p class="leerzustand">Noch keine Verbrauchswerte. Mit «Eintrag hinzufügen» das erste Jahr erfassen.</p>
        ) : (
          v.eintraege.map((x, i) => <EintragZeile eintrag={x as VerbrauchsEintrag & { id: string }} nr={i + 1} key={x.id} />)
        )}
        {fws && fws.streuung.prozent !== null && (
          <Ampel
            ampel={fws.streuung.ampel}
            text={`Grösste Abweichung eines Jahres vom Mittel: ${fmt(fws.streuung.prozent, 0)} %`}
            legende={[
              { ampel: 'gruen', text: `unter ${STREUUNG.gelbAbProzent} % — Jahre passen zusammen` },
              { ampel: 'gelb', text: `${STREUUNG.gelbAbProzent}–${STREUUNG.rotAbProzent} % — Ursache prüfen (Leerstand, Wetter, Sanierung)` },
              { ampel: 'rot', text: `ab ${STREUUNG.rotAbProzent} % — Werte prüfen` },
              { ampel: 'grau', text: 'nur ein Jahr — nicht beurteilbar' },
            ]}
            testid="streuung"
          />
        )}
        <Meldungen schritt="verbrauch" codes={['verbrauch.']} testid="verbrauch-meldungen" />
      </Abschnitt>

      {traeger.length > 0 && (
        <Abschnitt titel="Energieträger und Nutzungsgrad" text="Der Jahresnutzungsgrad η des bisherigen Wärmeerzeugers rechnet den Energieinhalt in Nutzwärme um.">
          <SegmentFeld pfad="verbrauch.konvention" label="Heizwert-Konvention" optionen={[{ wert: 'fwsKurs', label: 'FWS-Kurs (Ho, Kurs-η)' }, { wert: 'hi', label: 'unterer Heizwert Hi (BFE)' }]} testid="konvention" info="FWS-Kurs reproduziert die Kurslösungen (Öl 10.5 kWh/l, Gas 10.4 kWh/m³ mit Kurs-Nutzungsgraden). Hi ist die BFE-Konvention; dann muss η auf Hi bezogen sein." />
          {traeger.map((t) => {
            const r = fws?.traeger.find((x) => x.energietraeger === t);
            const presets = etaPresetsFuer(t, daten.fws);
            return (
              <div class="unterblock" key={t} data-testid={`traeger-${t}`}>
                <h3 class="unterblock__titel">{traegerInfo(t)?.label ?? t}</h3>
                <Raster>
                  {presets.length > 0 && <AuswahlFeld pfad={`verbrauch.eta.${t}.preset`} label="Wärmeerzeuger bisher" optionen={presets.map((p) => ({ wert: p.key, label: p.label }))} leerText="— nicht gewählt —" testid={`eta-${t}-preset`} />}
                  <ZahlFeld pfad={`verbrauch.eta.${t}.wert`} label="Jahresnutzungsgrad η" min={0.3} max={1.1} dez={3} standard={r?.eta} testid={`eta-${t}`} />
                </Raster>
                {r && (
                  <table class="tabelle tabelle--kompakt">
                    <tbody>
                      <tr><td>Mittlere Jahresmenge</td><td class="zahl"><WertAnzeige wert={r.jahresmenge} text={zahl(r.jahresmenge.wert, `${r.einheit}/a`)} testid={`traeger-${t}-menge`} /></td></tr>
                      <tr><td>Heizwert</td><td class="zahl"><WertAnzeige wert={r.heizwert} text={zahl(r.heizwert.wert, `kWh/${r.einheit}`, 2)} /></td></tr>
                      <tr><td>Nutzwärme</td><td class="zahl"><WertAnzeige wert={r.qnBrutto} text={zahl(r.qnBrutto.wert, 'kWh/a')} testid={`traeger-${t}-qn`} /></td></tr>
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </Abschnitt>
      )}

      <Abschnitt titel="Warmwasser im bisherigen Verbrauch">
        <JaNeinFeld pfad="verbrauch.wwBisher" label="Enthielt der bisherige Verbrauch auch das Warmwasser?" testid="ww-bisher" info="Wenn ja, wird der Warmwasseranteil vom Verbrauch abgezogen. Ob die neue Wärmepumpe Warmwasser bereitet, wird separat in Schritt 5 gefragt." />
        {rel('verbrauch.abzug') && <WwAngaben basis="verbrauch.abzug" ergebnis={store.ergebnis.value.warmwasser.bisher} testid="abzug" />}
        {fws?.wwAbzug && (
          <div class="ergebniszeile">
            <span>Abzug vom Verbrauch</span>
            <WertAnzeige wert={fws.wwAbzug} text={zahl(fws.wwAbzug.wert, 'kWh/a')} testid="ww-abzug" />
          </div>
        )}
      </Abschnitt>

      <Abschnitt titel="Klimabereinigung">
        <label class="kaestchen__eintrag">
          <input type="checkbox" checked={v.klimabereinigung} onChange={(e) => setze('verbrauch.klimabereinigung', (e.currentTarget as HTMLInputElement).checked)} data-testid="klimabereinigung" />
          Verbrauch mit Heizgradtagen auf ein Normjahr umrechnen (nicht Teil des FWS-Kurses)
        </label>
        {v.klimabereinigung && <p class="zeile-info">Im Jahresraster je Eintrag die Heizgradtage des Zeitraums angeben; Einträge ohne Angabe bleiben unbereinigt.</p>}
      </Abschnitt>
    </>
  );
}

function Volllaststunden() {
  const fws = store.ergebnis.value.heizlast.fws;
  const bedarf = Object.entries(daten.fws.tvoll.bedarfsarten).map(([k, b]) => ({ wert: k, label: b.label }));
  return (
    <Abschnitt titel="Volllaststunden" text="Teilen die Jahres-Nutzwärme durch die Stunden, in denen die Heizung rechnerisch mit voller Leistung läuft (FWS Folie 16).">
      <Raster>
        <AuswahlFeld pfad="verbrauch.bedarfsart" label="Nutzung" optionen={bedarf} testid="bedarfsart" beiWahl={(w) => w && setze('verbrauch.bedarfsart', w)} />
        <ZahlFeld pfad="verbrauch.tvollOverride" label={<>Volllaststunden t<sub>voll</sub></>} einheit="h/a" min={500} max={5000} ganz standard={fws?.tvoll} testid="tvoll" />
      </Raster>
    </Abschnitt>
  );
}

/** Schritt 3A — Verbrauch (nur FWS). */
export function Verbrauch() {
  const v = store.state.value.verbrauch;
  const e = store.ergebnis.value;
  const fws = e.heizlast.fws;
  return (
    <>
      <Fehlend schritt="verbrauch" />
      <Abschnitt titel="Liegen Verbrauchsdaten vor?">
        <OptionKarten pfad="verbrauch.quelle" label="Datenquelle" optionen={QUELLEN} testid="quelle" />
      </Abschnitt>

      {v.quelle === 'rechnungen' && <Rechnungen />}

      {rel('verbrauch.wpBetriebsstunden') && (
        <Abschnitt titel="Bestehende Wärmepumpe" text="Betriebsstunden pro Jahr mal Nennleistung ergeben die Nutzwärme (FWS Aufgabe 4); alternativ Strom × COP.">
          <Raster>
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.zaehlerH" label="Betriebsstunden Zählerstand" einheit="h" min={0} testid="wp-zaehler" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.betriebsjahre" label="Betriebsjahre" einheit="a" min={0.5} max={50} testid="wp-jahre" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.qWpW" label="Heizleistung der WP (Normpunkt)" einheit="kW" faktor={1000} min={0.5} max={500} testid="wp-leistung" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.stromKwhA" label="oder: Stromverbrauch WP" einheit="kWh/a" min={0} testid="wp-strom" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.cop" label="mit COP bzw. JAZ" min={1} max={8} dez={2} testid="wp-cop" />
            <ZahlFeld pfad="verbrauch.wpBetriebsstunden.erdsondeLaengeM" label="Erdsondenlänge (optional)" einheit="m" min={0} testid="wp-sonde" />
          </Raster>
          <Meldungen schritt="verbrauch" codes={['wp', 'methodeB']} />
        </Abschnitt>
      )}

      {rel('verbrauch.messung') && (
        <Abschnitt titel="Wärmezähler">
          <Raster spalten={3}>
            <ZahlFeld pfad="verbrauch.messung.qnHeizungKwhA" label="Heizwärme pro Jahr" einheit="kWh/a" min={0} testid="messung-qn" />
            <TextFeld pfad="verbrauch.messung.von" label="Messung von" platzhalter="2022-01-01" muster={/^\d{4}-\d{2}(-\d{2})?$/} musterText="Datum als JJJJ-MM-TT." />
            <TextFeld pfad="verbrauch.messung.bis" label="bis" platzhalter="2024-12-31" muster={/^\d{4}-\d{2}(-\d{2})?$/} musterText="Datum als JJJJ-MM-TT." />
          </Raster>
        </Abschnitt>
      )}

      {v.quelle === 'keine' && (
        <Abschnitt titel="Schätzung nach Bauperiode" text="Ohne Verbrauch schätzt der FWS-Kurs die Heizlast aus dem typischen Energiebedarf der Bauperiode. Das ist nur ein Richtwert.">
          {fws?.bauperiodeBand ? (
            <div class="ergebniszeile">
              <span>
                {fws.bauperiodeBand.label}: {fmt(fws.bauperiodeBand.kwhM2a[0], 0)}–{fmt(fws.bauperiodeBand.kwhM2a[1], 0)} kWh/m²a
              </span>
              <WertAnzeige wert={fws.qhl} text={kW(fws.qhl?.wert)} testid="bauperiode-qhl" />
            </div>
          ) : (
            <p class="leerzustand">Für die Schätzung braucht es in Schritt 1 Gebäudetyp, Baujahr und EBF.</p>
          )}
        </Abschnitt>
      )}

      {rel('verbrauch.tvollOverride') && <Volllaststunden />}
      {lese('verbrauch.quelle') === null && <p class="leerzustand">Datenquelle wählen — die passenden Eingaben erscheinen darunter.</p>}
    </>
  );
}
