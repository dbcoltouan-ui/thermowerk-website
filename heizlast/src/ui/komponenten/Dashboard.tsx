import { useSignal } from '@preact/signals';
import type { Annahme } from '../../kern/berechne';
import { aktiverSchritt, ergebnis, geheZu } from '../../state/ui';
import type { SchrittDef, SchrittStatus } from '../schritte';
import { SCHRITTE, STATUS_TEXT } from '../schritte';
import { kW, zahl } from '../format';
import { fmt } from '../../kern/wert';
import { herkunftKlasse, herkunftKurz, WertAnzeige } from './Herkunft';
import { Skala } from './Skala';

interface Props {
  schritte: ReadonlyArray<SchrittDef>;
  status: Partial<Record<string, SchrittStatus>>;
}

const STATUS_BADGE = { gemessen: 'aus Verbrauch', raumweise: 'raumweise', schaetzung: 'Schätzung', fehlt: 'unvollständig' } as const;

/** Annahmen-Liste mit Sprungziel (UX-50–52): je Schritt gruppiert, Klick öffnet den Schritt. */
function AnnahmenListe({ annahmen }: { annahmen: ReadonlyArray<Annahme> }) {
  const gruppen = SCHRITTE.map((s) => ({ s, liste: annahmen.filter((a) => a.schritt === s.id) })).filter((g) => g.liste.length);
  return (
    <details class="annahmen" data-testid="annahmen">
      <summary class="annahmen__kopf">
        <span>
          <strong data-testid="kpi-annahmen">{annahmen.length}</strong> {annahmen.length === 1 ? 'Wert' : 'Werte'} geschätzt oder als Standard angenommen
        </span>
      </summary>
      <ul class="annahmen__liste">
        {gruppen.map(({ s, liste }) => (
          <li key={s.id}>
            <button type="button" class="annahmen__schritt" onClick={() => geheZu(s.id)} data-testid={`annahmen-sprung-${s.id}`}>
              {s.nr} {s.titel}
            </button>
            <ul>
              {liste.map((a, i) => (
                <li class="annahmen__eintrag" key={i} title={a.wert.quelle}>
                  <span class={`herkunft-muster herkunft-muster--${herkunftKlasse(a.wert)}`} aria-hidden="true" />
                  <span>
                    {a.wert.begruendung}
                    <span class="mute"> — {herkunftKurz(a.wert)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Fortschritt je Schritt als Segmentleiste; jedes Segment springt zum Schritt. */
function Fortschritt({ schritte, status }: Props) {
  const fertig = schritte.filter((s) => s.id !== 'bericht' && status[s.id] && status[s.id] !== 'offen').length;
  const anzahl = schritte.filter((s) => s.id !== 'bericht').length;
  return (
    <div class="fortschritt">
      <div class="fortschritt__kopf">
        <span>Fortschritt</span>
        <span class="mute" data-testid="fortschritt-text">
          {fertig} von {anzahl} Schritten erfasst
        </span>
      </div>
      <ol class="fortschritt__segmente">
        {schritte
          .filter((s) => s.id !== 'bericht')
          .map((s) => {
            const st = status[s.id] ?? 'offen';
            return (
              <li key={s.id}>
                <button type="button" class={`segment-status segment-status--${st}${aktiverSchritt.value === s.id ? ' segment-status--aktiv' : ''}`} onClick={() => geheZu(s.id)} title={`${s.nr} ${s.titel}: ${STATUS_TEXT[st]}`} aria-label={`${s.nr} ${s.titel}: ${STATUS_TEXT[st]}`} />
              </li>
            );
          })}
      </ol>
    </div>
  );
}

/**
 * Dashboard: liest ausschliesslich `Ergebnis` — nie eigene Rechnung (KONTEXT §2 «Eine Quelle der Wahrheit»).
 * Inhalt nach befund_ux-datenfluss §5.2.
 */
function DashboardInhalt({ schritte, status }: Props) {
  const e = ergebnis.value;
  const m = e.heizlast.massgebend;
  const z = e.zuschlaege;
  const qh = z.qh;
  const wab = e.waermeabgabe;
  const kritisch = wab?.gebaeude.kritischeRaeume ?? [];
  const vlFallback = e.auslegungsVL.herkunft === 'fallback';
  const unsicher = m.wert?.unsicherheit;
  return (
    <div class="dashboard__inner">
      <div class="kennzahl">
        <span class="kennzahl__label">
          Heizleistung Q<sub>h</sub>
        </span>
        <span class={`kennzahl__wert${qh ? '' : ' leer'}`} data-testid="kpi-qh">
          {kW(qh?.wert)}
        </span>
        <span class="kennzahl__marken">
          {e.methode ? <span class="badge badge--brand" data-testid="kpi-methode">{e.methode === 'fws' ? 'FWS-Kurs' : 'SIA 384/2'}</span> : <span class="mute">Methode wählen</span>}
          {e.methode && (
            <span class={`status status--${m.status}`} data-testid="kpi-status">
              {STATUS_BADGE[m.status]}
              {m.status === 'schaetzung' && unsicher ? ` ±${fmt(unsicher, 0)} %` : ''}
            </span>
          )}
        </span>
      </div>

      <dl class="aufschluesselung" data-testid="aufschluesselung">
        <div>
          <dt>Heizlast Q<sub>hl</sub></dt>
          <dd data-testid="kpi-qhl">{kW(z.qhl?.wert)}</dd>
        </div>
        <div>
          <dt>Warmwasser Q<sub>w</sub></dt>
          <dd data-testid="kpi-qw">{qh ? kW(z.qw.wert) : '—'}</dd>
        </div>
        <div>
          <dt>Sperrzeit Q<sub>off</sub></dt>
          <dd data-testid="kpi-qoff">{qh ? kW(z.qoff.wert) : '—'}</dd>
        </div>
        <div>
          <dt>Zusätze Q<sub>as</sub></dt>
          <dd>{qh ? kW(z.qas.wert) : '—'}</dd>
        </div>
      </dl>

      <div class="dashboard__zeile">
        <span>spezifisch</span>
        <span class="dashboard__wert">
          <span class={`ampel-punkt ampel-punkt--${e.ebf ? (e.plausi.spezifisch?.ampel ?? 'grau') : 'grau'}`} aria-hidden="true" />
          <span data-testid="kpi-spez" class={e.heizlast.spezifisch ? '' : 'leer'}>
            {zahl(e.heizlast.spezifisch?.wert, 'W/m²', 1)}
          </span>
        </span>
      </div>
      <div class="dashboard__zeile dashboard__zeile--unter">
        <span>EBF</span>
        <WertAnzeige wert={e.ebf} text={zahl(e.ebf?.wert, 'm²')} testid="kpi-ebf" immerChip />
      </div>

      <div class="dashboard__block">
        <Skala skala={e.skalen.vorlauf} testid="skala-vorlauf" text={vlFallback ? undefined : wab?.gebaeude.urteil} />
        <div class="dashboard__zeile dashboard__zeile--unter">
          <span class="dashboard__klein">{vlFallback ? 'Noch keine Heizflächen bewertet, gerechnet mit' : 'Auslegungs-Vorlauf'}</span>
          <WertAnzeige wert={e.auslegungsVL} text={zahl(e.auslegungsVL.wert, '°C')} testid="kpi-vl" />
        </div>
        {kritisch.length > 0 && (
          <p class="dashboard__klein" data-testid="kpi-kritisch">
            Massgebend: {kritisch.map((r) => `${r.name} ${r.tVLReq === null ? '> 90' : fmt(r.tVLReq, 0)} °C`).join(', ')}
          </p>
        )}
        {wab && wab.gebaeude.raeumeBewertet > 0 && (
          <p class="dashboard__klein" data-testid="kpi-raeume-rot">
            {wab.gebaeude.raeumeRot === 0
              ? `Alle ${wab.gebaeude.raeumeBewertet} Räume bei ${fmt(wab.gebaeude.zielVL.wert, 0)} °C gedeckt`
              : `${wab.gebaeude.raeumeRot} von ${wab.gebaeude.raeumeBewertet} Räumen: Heizfläche zu klein bei ${fmt(wab.gebaeude.zielVL.wert, 0)} °C`}
          </p>
        )}
      </div>

      <div class="dashboard__zeile">
        <span>Speicher WW / Puffer</span>
        <span data-testid="kpi-speicher">
          {zahl(e.speicher.ww?.volumenEffektiv.wert, 'l')} / {zahl(e.speicher.pufferEffektiv.wert, 'l')}
        </span>
      </div>
      <div class="dashboard__block">
        <div class="dashboard__zeile">
          <span>Wärmepumpe</span>
          <span data-testid="kpi-wp">{e.geraet.gewaehlt ? `${e.geraet.gewaehlt.bezeichnung}, ${kW(e.geraet.gewaehlt.qWpMassgebend.wert, 1)}` : 'noch nicht gewählt'}</span>
        </div>
        {e.geraet.gewaehlt && <Skala skala={e.skalen.wpGroesse} testid="skala-wp" text={e.geraet.gewaehlt.dimensionierung.text} />}
      </div>

      <AnnahmenListe annahmen={e.annahmen} />
      <Fortschritt schritte={schritte} status={status} />
    </div>
  );
}

/** Desktop: Seitenleiste rechts. */
export function Dashboard(props: Props) {
  return (
    <aside class="dashboard" aria-label="Dashboard" data-testid="dashboard">
      <DashboardInhalt {...props} />
    </aside>
  );
}

/** Mobil: aufklappbare Leiste am unteren Rand. */
export function DashboardLeiste(props: Props) {
  const offen = useSignal(false);
  const e = ergebnis.value;
  return (
    <div class="dashboard-leiste" data-offen={String(offen.value)} data-testid="dashboard-leiste">
      <button type="button" class="dashboard-leiste__kopf" aria-expanded={offen.value} onClick={() => (offen.value = !offen.value)}>
        <span class="dashboard-leiste__kennzahl">
          <span class="kennzahl__label">
            Q<sub>h</sub>
          </span>
          <span class={`dashboard-leiste__wert${e.zuschlaege.qh ? '' : ' leer'}`}>{kW(e.zuschlaege.qh?.wert)}</span>
        </span>
        <span class="dashboard-leiste__neben">
          Q<sub>hl</sub> {kW(e.zuschlaege.qhl?.wert)} · {e.annahmen.length} Annahmen
        </span>
        <span class="chevron" aria-hidden="true" />
      </button>
      <div class="dashboard-leiste__inhalt">
        <DashboardInhalt {...props} />
      </div>
    </div>
  );
}
