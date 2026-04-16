// Modul M7 – Gesamt WP-Auslegung Qh = Qhl + Qw + Qoff + Qas
import { el } from '../ui.js';
import { qhGesamt, inverterCheck } from '../heizlast.js';

export function renderM7(state) {
  const s = state.m7 ||= { qhWPDatenblatt: '', inverter: true };
  const body = el('div', {});

  body.appendChild(el('div', { class: 'row' },
    el('label', { class: 'field' },
      el('span', {}, 'WP-Typ'),
      el('select', { onchange: e => { s.inverter = e.target.value === 'inverter'; render(); }},
        el('option', { value: 'inverter', ...(s.inverter ? { selected: 'selected' } : {}) }, 'Inverter'),
        el('option', { value: 'einstufig', ...(!s.inverter ? { selected: 'selected' } : {}) }, '1-stufig / On-Off'))),
    el('label', { class: 'field' },
      el('span', {}, 'Qh,WP Datenblatt (am Auslegepunkt)'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.qhWPDatenblatt, step: '0.1',
          oninput: e => { s.qhWPDatenblatt = parseFloat(e.target.value) || ''; render(); }}),
        el('span', { class: 'unit' }, 'kW'))),
  ));

  const mount = el('div', { id: 'm7-result' });
  body.appendChild(mount);

  function render() {
    mount.innerHTML = '';
    const qhl = state._last?.qhl;
    const qoffV = state._lastZuschlaege?.qoff || 0;
    const qas  = state._lastZuschlaege?.qas  || 0;
    const qw   = state._lastQw?.qw  || 0;
    if (!qhl) {
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px' }},
        'Qhl aus M2 erforderlich.'));
      return;
    }
    const qh = qhGesamt(qhl, qw, qoffV, qas);
    state._lastQh = { qh: qh.wert };
    mount.appendChild(el('div', { class: 'result-card highlight' },
      el('div', {},
        el('div', { class: 'label' }, 'Wärmeerzeugerleistung Qh'),
        el('div', { class: 'value' }, `${qh.wert.toFixed(2)} kW`))));
    mount.appendChild(el('details', { class: 'steps' },
      el('summary', {}, 'Rechenweg'),
      el('div', { class: 'steps-list' },
        ...qh.steps.map(st => el('div', { class: 'step' },
          el('span', { class: 'left' }, st.formel),
          el('span', { class: 'right' }, st.wert || ''))))));

    if (s.qhWPDatenblatt && s.inverter) {
      const check = inverterCheck(qh.wert, parseFloat(s.qhWPDatenblatt));
      mount.appendChild(el('div', { style: { marginTop: '12px' }},
        el('div', { class: 'result-card' },
          el('div', {},
            el('div', { class: 'label' }, 'Inverter-Check (Qh ≥ 0.75 · QWP)'),
            el('div', { class: 'value' }, `${(check.wert * 100).toFixed(1)} %`)),
          el('span', { class: `ampel ${check.ok ? 'gruen' : 'rot'}` }, check.ok ? 'OK' : 'zu gross')),
        el('details', { class: 'steps' },
          el('summary', {}, 'Rechenweg'),
          el('div', { class: 'steps-list' },
            ...check.steps.map(st => el('div', { class: 'step' },
              el('span', { class: 'left' }, st.formel),
              el('span', { class: 'right' }, st.wert || '')))))));
    }
  }
  body._recompute = render;
  setTimeout(render, 0);
  return body;
}
