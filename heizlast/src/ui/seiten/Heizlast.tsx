import type { Wert } from '../../kern/wert';
import { fmt } from '../../kern/wert';
import { daten, store } from '../bindung';
import { Ampel } from '../komponenten/Ampel';
import { Abschnitt } from '../komponenten/Felder';
import { WertAnzeige } from '../komponenten/Herkunft';
import { Fehlend, Meldungen } from '../komponenten/Meldungen';
import { kW, zahl } from '../format';

const STATUS_TEXT = { gemessen: 'aus Verbrauch', raumweise: 'raumweise', schaetzung: 'Schätzung', fehlt: 'unvollständig' } as const;

/** Eine Zeile des Rechenwegs: Bezeichnung, Formel mit eingesetzten Zahlen (Begründung), Ergebnis. */
function Schritt({ label, wert, text, testid }: { label: string; wert: Wert | null | undefined; text: string; testid?: string }) {
  if (!wert) return null;
  return (
    <li class="rechenweg__schritt">
      <span class="rechenweg__label">{label}</span>
      <span class="rechenweg__formel">{wert.begruendung}</span>
      <span class="rechenweg__wert">
        <WertAnzeige wert={wert} text={text} testid={testid} />
      </span>
    </li>
  );
}

function RechenwegFws() {
  const f = store.ergebnis.value.heizlast.fws;
  if (!f) return null;
  return (
    <Abschnitt titel="Rechenweg (FWS-Kurs Modul 3)" testid="rechenweg-fws">
      <ol class="rechenweg">
        {f.traeger.map((t) => (
          <Schritt key={t.energietraeger} label={`Nutzwärme ${daten.fws.heizwerte.konventionen.fwsKurs?.traeger[t.energietraeger]?.label ?? t.energietraeger}`} wert={t.qnBrutto} text={zahl(t.qnBrutto.wert, 'kWh/a')} />
        ))}
        {f.traeger.length !== 1 && <Schritt label="Nutzwärme gesamt" wert={f.qnBrutto} text={zahl(f.qnBrutto?.wert, 'kWh/a')} />}
        <Schritt label="Abzug Warmwasser" wert={f.wwAbzug} text={zahl(f.wwAbzug?.wert, 'kWh/a')} />
        <Schritt label="Heizwärme unsaniert" wert={f.qnHeizungUnsaniert} text={zahl(f.qnHeizungUnsaniert?.wert, 'kWh/a')} />
        {f.sanierungen.ausgefuehrt.length > 0 && <Schritt label="Heizwärme heute" wert={f.qnHeizungIst} text={zahl(f.qnHeizungIst?.wert, 'kWh/a')} />}
        <Schritt label="Volllaststunden" wert={f.tvoll} text={zahl(f.tvoll.wert, 'h/a')} />
        {f.sanierungen.ausgefuehrt.length + f.sanierungen.geplant.length > 0 && <Schritt label="Heizlast unsaniert" wert={f.qhlUnsaniert} text={kW(f.qhlUnsaniert?.wert)} />}
        {f.sanierungen.geplant.length > 0 && <Schritt label="Heizlast heute" wert={f.qhlIst} text={kW(f.qhlIst?.wert)} />}
        <Schritt label="Heizlast Q_hl" wert={f.qhl} text={kW(f.qhl?.wert)} testid="rechenweg-qhl" />
      </ol>
    </Abschnitt>
  );
}

function RaumTabelle() {
  const rw = store.ergebnis.value.heizlast.raumweise;
  if (!rw || !rw.raeume.length) return null;
  return (
    <Abschnitt titel="Räume" text={rw.methode} testid="raumtabelle">
      <div class="tabelle-rahmen">
        <table class="tabelle">
          <thead>
            <tr>
              <th>Raum</th>
              <th class="zahl">θ<sub>int</sub></th>
              <th class="zahl">Fläche</th>
              <th class="zahl">Φ<sub>T</sub></th>
              <th class="zahl">Φ<sub>V</sub></th>
              <th class="zahl">Φ<sub>HL</sub></th>
              <th class="zahl nur-breit">W/m²</th>
            </tr>
          </thead>
          <tbody>
            {rw.raeume.map((r) => (
              <tr key={r.id} data-testid={`heizlast-raum-${r.id}`}>
                <td>
                  {r.name}
                  {!r.beheizt && <span class="mute"> (unbeheizt)</span>}
                </td>
                <td class="zahl">{zahl(r.thetaInt.wert, '°C', 1)}</td>
                <td class="zahl">{zahl(r.flaeche.wert, 'm²', 1)}</td>
                <td class="zahl">{zahl(r.phiT.wert, 'W')}</td>
                <td class="zahl">{zahl(r.phiV.wert, 'W')}</td>
                <td class="zahl" data-testid={`heizlast-raum-${r.id}-phihl`}>
                  <strong>{zahl(r.phiHL.wert, 'W')}</strong>
                </td>
                <td class="zahl nur-breit">{fmt(r.phiSpez.wert, 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>Summe der Räume (für die Heizflächen)</td>
              <td class="zahl" data-testid="summe-raeume">{zahl(rw.summeRaeume.wert, 'W')}</td>
              <td class="nur-breit" />
            </tr>
            <tr>
              <td colSpan={5}>Gebäudehülle saldiert (ohne Wärmeflüsse zwischen beheizten Räumen)</td>
              <td class="zahl" data-testid="saldiert">{zahl(rw.saldiertRaeume.wert, 'W')}</td>
              <td class="nur-breit" />
            </tr>
            {rw.rest && (
              <tr>
                <td colSpan={5}>Nicht erfasste Flächen</td>
                <td class="zahl">{zahl(rw.rest.phiHL.wert, 'W')}</td>
                <td class="nur-breit" />
              </tr>
            )}
            <tr class="tabelle__summe">
              <td colSpan={5}>Gebäude-Heizlast (massgebend für den Wärmeerzeuger)</td>
              <td class="zahl" data-testid="gebaeude-heizlast">{zahl(rw.gebaeude.wert, 'W')}</td>
              <td class="nur-breit" />
            </tr>
          </tfoot>
        </table>
      </div>
      <Meldungen schritt="huelle" codes={['gebaeude.']} />
    </Abschnitt>
  );
}

/** Schritt 4 — Heizlast (Ergebnisseite): massgebende Q_hl mit Herkunft und Band, Rechenweg bzw. Raumtabelle, Gegenprobe. */
export function Heizlast() {
  const e = store.ergebnis.value;
  const m = e.heizlast.massgebend;
  const sp = e.plausi.spezifisch;
  const gp = e.heizlast.gegenprobe;
  const band = m.wert?.band ? `${kW(m.wert.band[0])} – ${kW(m.wert.band[1])}` : null;
  return (
    <>
      <Fehlend schritt="heizlast" />
      <section class="leistung" data-status={m.status} data-testid="heizlast-massgebend">
        <div class="leistung__kopf">
          <span class="leistung__titel">Heizlast Q<sub>hl</sub></span>
          <span class={`status status--${m.status}`} data-testid="heizlast-status">
            {STATUS_TEXT[m.status]}
          </span>
        </div>
        <div class="leistung__zahl">
          <WertAnzeige wert={m.wert} text={kW(m.wert?.wert)} gross testid="heizlast-qhl" immerChip />
        </div>
        <p class="leistung__methode" data-testid="heizlast-methode">{m.label}</p>
        <dl class="leistung__fakten">
          {band && (
            <div>
              <dt>Spanne</dt>
              <dd>{band}</dd>
            </div>
          )}
          {m.wert?.unsicherheit !== undefined && (
            <div>
              <dt>Unsicherheit</dt>
              <dd>±{fmt(m.wert.unsicherheit, 0)} %</dd>
            </div>
          )}
          <div>
            <dt>Aussentemperatur</dt>
            <dd>
              <WertAnzeige wert={e.thetaE} text={zahl(e.thetaE.wert, '°C', 1)} />
            </dd>
          </div>
          <div>
            <dt>spezifisch</dt>
            <dd>
              <WertAnzeige wert={e.heizlast.spezifisch} text={zahl(e.heizlast.spezifisch?.wert, 'W/m²', 1)} testid="heizlast-spez" />
            </dd>
          </div>
        </dl>
      </section>

      {sp && (
        <Abschnitt titel="Plausibilität" text={`Vergleich mit dem typischen Bereich: ${sp.bandLabel}.`}>
          <Ampel
            ampel={sp.ampel}
            text={sp.text}
            legende={[
              { ampel: 'gruen', text: 'im typischen Bereich der Bauperiode' },
              { ampel: 'gelb', text: 'bis 15 % ausserhalb — Eingaben prüfen' },
              { ampel: 'rot', text: 'deutlich ausserhalb — Eingaben oder Annahmen prüfen' },
            ]}
            testid="plausi"
          />
        </Abschnitt>
      )}

      {e.methode === 'fws' && <RechenwegFws />}
      {e.methode === 'raumweise' && <RaumTabelle />}

      {gp && (
        <Abschnitt titel="Gegenprobe" text={`Zum Vergleich ${gp.methode === 'raumweise' ? 'raumweise nach SIA 384/2 aus den erfassten Bauteilen' : 'nach FWS-Kurs aus den erfassten Rechnungen'} — nicht massgebend.`} testid="gegenprobe">
          <div class="ergebniszeile">
            <span>{gp.methode === 'raumweise' ? 'Raumweise (SIA 384/2)' : 'Verbrauch (FWS)'}</span>
            <WertAnzeige wert={gp.wert} text={kW(gp.wert.wert)} />
          </div>
          <Ampel
            ampel={gp.vergleich.ampel}
            text={gp.vergleich.text}
            legende={[
              { ampel: 'gruen', text: 'Norm 10–25 % über dem Verbrauch — erwartet' },
              { ampel: 'gelb', text: 'etwas ausserhalb' },
              { ampel: 'rot', text: 'deutlich ausserhalb — Eingaben prüfen' },
            ]}
          />
        </Abschnitt>
      )}
      {!m.wert && <p class="leerzustand">Sobald die Angaben in Schritt 1–3 vollständig sind, steht hier die Heizlast.</p>}
    </>
  );
}
