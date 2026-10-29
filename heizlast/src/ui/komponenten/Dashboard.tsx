import { useSignal } from '@preact/signals';
import { ergebnis, methode } from '../../state/ui';
import { METHODEN } from '../../state/typen';
import type { SchrittStatus } from '../schritte';
import { kW, zahl } from '../format';
import { Skala } from './Skala';

interface Props {
  anzahlSchritte: number;
  status: Record<string, SchrittStatus>;
}

/**
 * Dashboard: liest ausschliesslich `Ergebnis` — nie eigene Rechnung (KONTEXT §2 «Eine Quelle der Wahrheit»).
 * Session 6 bindet die KPIs an; Gestaltung, Herkunfts-Chips und Annahmen-Liste folgen in Session 7.
 */
function DashboardInhalt({ anzahlSchritte, status }: Props) {
  const fertig = Object.values(status).filter((s) => s !== 'offen').length;
  const prozent = Math.round((fertig / anzahlSchritte) * 100);
  const m = METHODEN.find((x) => x.id === methode.value);
  const e = ergebnis.value;
  const qh = e.zuschlaege.qh?.wert ?? null;
  const qhl = e.heizlast.massgebend.wert?.wert ?? null;
  const spez = e.heizlast.spezifisch?.wert ?? null;
  const vl = e.auslegungsVL;

  return (
    <div class="dashboard__inner">
      <div class="kpi">
        <span class="kpi__label">Heizleistung Q<sub>h</sub></span>
        <span class={`kpi__wert${qh === null ? ' leer' : ''}`} data-testid="kpi-qh">
          {kW(qh)}
        </span>
        <span class="kpi__sub">
          {m ? <span class="badge badge--brand">{m.id === 'fws' ? 'FWS-Kurs' : 'SIA 384/2'}</span> : 'Methode wählen'}
        </span>
      </div>
      <div>
        <div class="dashboard__zeile">
          <span class="mute">Heizlast Q<sub>hl</sub></span>
          <span class={qhl === null ? 'leer' : ''} data-testid="kpi-qhl">{kW(qhl)}</span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">spezifisch</span>
          <span class={spez === null ? 'leer' : ''}>{zahl(spez, 'W/m²', 1)}</span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">Auslegungs-VL</span>
          <span class={vl.herkunft === 'fallback' ? 'leer' : ''} data-testid="kpi-vl" title={vl.begruendung}>
            {zahl(vl.wert, '°C', 0)}
          </span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">Speicher WW / Puffer</span>
          <span>
            {zahl(e.speicher.ww?.volumenEffektiv.wert, 'l')} / {zahl(e.speicher.pufferEffektiv.wert, 'l')}
          </span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">Wärmepumpe</span>
          <span data-testid="kpi-wp">{e.geraet.gewaehlt ? `${e.geraet.gewaehlt.bezeichnung} · ${kW(e.geraet.gewaehlt.qWpMassgebend.wert, 1)}` : '—'}</span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">Annahmen</span>
          <span data-testid="kpi-annahmen">{e.annahmen.length}</span>
        </div>
      </div>
      <Skala skala={e.skalen.vorlauf} testid="skala-vorlauf" text={e.auslegungsVL.herkunft === 'fallback' ? 'Noch keine Heizflächen bewertet' : e.waermeabgabe?.gebaeude.urteil} />
      {e.geraet.gewaehlt && <Skala skala={e.skalen.wpGroesse} testid="skala-wp" text={e.geraet.gewaehlt.dimensionierung.text} />}
      <div class="kpi">
        <span class="kpi__label">Fortschritt</span>
        <div class="fortschritt" role="progressbar" aria-valuenow={prozent} aria-valuemin={0} aria-valuemax={100}>
          <div class="fortschritt__balken" style={{ width: `${prozent}%` }} />
        </div>
        <span class="kpi__sub">
          {fertig} von {anzahlSchritte} Schritten
        </span>
      </div>
    </div>
  );
}

/** Desktop: Seitenleiste rechts. */
export function Dashboard(props: Props) {
  return (
    <aside class="dashboard karte" aria-label="Dashboard" data-testid="dashboard">
      <div class="karte__titel">Dashboard</div>
      <DashboardInhalt {...props} />
    </aside>
  );
}

/** Mobil: aufklappbare Leiste am unteren Rand. */
export function DashboardLeiste(props: Props) {
  const offen = useSignal(false);
  return (
    <div class="dashboard-leiste" data-offen={String(offen.value)} data-testid="dashboard-leiste">
      <button
        type="button"
        class="dashboard-leiste__kopf"
        aria-expanded={offen.value}
        onClick={() => (offen.value = !offen.value)}
      >
        <span class="kpi">
          <span class="kpi__label">Heizleistung Q<sub>h</sub></span>
          <span class={`kpi__wert${ergebnis.value.zuschlaege.qh ? '' : ' leer'}`}>{kW(ergebnis.value.zuschlaege.qh?.wert)}</span>
        </span>
        <span class="chevron" aria-hidden="true" />
      </button>
      <div class="dashboard-leiste__inhalt">
        <DashboardInhalt {...props} />
      </div>
    </div>
  );
}
