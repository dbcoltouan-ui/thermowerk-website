// Modul M3 – Plausibilitätskontrolle W/m² gegen §7
import { el } from '../ui.js';
import { spezHeizleistung } from '../heizlast.js';

export function renderM3(state) {
  const body = el('div', { id: 'm3-body' });
  function render() {
    body.innerHTML = '';
    const m1 = state.m1 || {};
    const qhl = state._last?.qhl;
    if (!qhl || !m1.ebf || !m1.bauperiode) {
      body.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px' }},
        'EBF und Bauperiode in Stammdaten (M1) sowie eine berechnete Qhl (M2) erforderlich.'));
      return;
    }
    const g = m1.gebaeudetyp === 'mfh' ? 'mfh' : 'efh';
    const res = spezHeizleistung(qhl, parseFloat(m1.ebf), m1.bauperiode, g);
    if (!res) { body.appendChild(el('div', {}, '–')); return; }
    body.appendChild(el('div', { class: 'result-card' },
      el('div', {},
        el('div', { class: 'label' }, 'Spezifische Heizleistung'),
        el('div', { class: 'value' }, `${res.wert.toFixed(1)} W/m²`)),
      el('span', { class: `ampel ${res.ampel}` }, res.ampel.toUpperCase()),
    ));
    body.appendChild(el('details', { class: 'steps' },
      el('summary', {}, 'Rechenweg'),
      el('div', { class: 'steps-list' },
        ...res.steps.map(st => el('div', { class: 'step' },
          el('span', { class: 'left' }, st.formel),
          el('span', { class: 'right' }, st.wert || ''))))));
    if (res.hinweis) body.appendChild(el('div', { class: 'hinweis' }, res.hinweis));
  }
  body._render = render;
  setTimeout(render, 0);
  return body;
}
