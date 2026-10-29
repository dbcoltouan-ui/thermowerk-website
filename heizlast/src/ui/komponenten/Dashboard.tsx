import { useSignal } from '@preact/signals';
import { methode } from '../../state/ui';
import { METHODEN } from '../../state/typen';
import type { SchrittStatus } from '../schritte';

interface Props {
  anzahlSchritte: number;
  status: Record<string, SchrittStatus>;
}

/**
 * Dashboard (Session 1: Platzhalter-KPIs). Ab Session 6 liest es ausschliesslich
 * `Ergebnis` — nie den State, nie eigene Rechnung (KONTEXT §2 «Eine Quelle der Wahrheit»).
 */
function DashboardInhalt({ anzahlSchritte, status }: Props) {
  const fertig = Object.values(status).filter((s) => s !== 'offen').length;
  const prozent = Math.round((fertig / anzahlSchritte) * 100);
  const m = METHODEN.find((x) => x.id === methode.value);

  return (
    <div class="dashboard__inner">
      <div class="kpi">
        <span class="kpi__label">Heizleistung Q<sub>h</sub></span>
        <span class="kpi__wert leer" data-testid="kpi-qh">
          —
        </span>
        <span class="kpi__sub">
          {m ? <span class="badge badge--brand">{m.id === 'fws' ? 'FWS-Kurs' : 'SIA 384/2'}</span> : 'Methode wählen'}
        </span>
      </div>
      <div>
        <div class="dashboard__zeile">
          <span class="mute">Heizlast Q<sub>hl</sub></span>
          <span class="leer">—</span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">spezifisch</span>
          <span class="leer">— W/m²</span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">Auslegungs-VL</span>
          <span class="leer">— °C</span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">Speicher</span>
          <span class="leer">—</span>
        </div>
        <div class="dashboard__zeile">
          <span class="mute">Annahmen</span>
          <span class="leer">0</span>
        </div>
      </div>
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
          <span class="kpi__wert leer">—</span>
        </span>
        <span class="chevron" aria-hidden="true" />
      </button>
      <div class="dashboard-leiste__inhalt">
        <DashboardInhalt {...props} />
      </div>
    </div>
  );
}
