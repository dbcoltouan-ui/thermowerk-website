// Modul M6 – Leistungszuschläge: Qoff (Sperrzeit), Qas (verbundene Systeme)
// Qw folgt in M5/M6 kombiniert sobald QWW bekannt.
import { el } from '../ui.js';
import { qoff } from '../heizlast.js';

export function renderM6(state, onChange) {
  const s = state.m6 ||= { toff: 0, qas: 0 };
  const body = el('div', {});

  body.appendChild(el('div', { class: 'row' },
    el('label', { class: 'field' },
      el('span', {}, 'Sperrzeit toff (EVU)'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.toff, step: '0.5', min: '0', max: '12',
          oninput: e => { s.toff = parseFloat(e.target.value) || 0; recompute(); onChange?.(); }}),
        el('span', { class: 'unit' }, 'h/Tag'))),
    el('label', { class: 'field' },
      el('span', {}, 'Qas – verbundene Systeme', el('small', {}, ' (Lüftung, Pool)')),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.qas, step: '0.1', min: '0',
          oninput: e => { s.qas = parseFloat(e.target.value) || 0; recompute(); onChange?.(); }}),
        el('span', { class: 'unit' }, 'kW'))),
  ));

  const mount = el('div', { id: 'm6-result' });
  body.appendChild(mount);

  function recompute() {
    mount.innerHTML = '';
    const qhl = state._last?.qhl;
    if (!qhl) {
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px', marginTop: '10px' }},
        'Qhl aus M2 erforderlich.'));
      state._lastZuschlaege = { qoff: 0, qas: parseFloat(s.qas) || 0 };
      return;
    }
    const r = qoff(qhl, parseFloat(s.toff) || 0);
    mount.appendChild(el('div', { class: 'result-card' },
      el('div', {},
        el('div', { class: 'label' }, 'Qoff (Sperrzeitzuschlag)'),
        el('div', { class: 'value' }, `${r.wert.toFixed(2)} kW`))));
    mount.appendChild(el('details', { class: 'steps' },
      el('summary', {}, 'Rechenweg'),
      el('div', { class: 'steps-list' },
        ...r.steps.map(st => el('div', { class: 'step' },
          el('span', { class: 'left' }, st.formel),
          el('span', { class: 'right' }, st.wert || ''))))));
    state._lastZuschlaege = { qoff: r.wert, qas: parseFloat(s.qas) || 0 };
  }

  body._recompute = recompute;
  setTimeout(recompute, 0);
  return body;
}

function render() {}
