// Modul M4 – Sanierungs-Delta (multiplikativ)
// Checkbox-Liste der Massnahmen aus FWS M3 §6 + Slider innerhalb Band.
// Toggle "Sanierung anwenden" → Wenn aktiv: state._last.qhl = qhlRaw · Π(1−e_i)
// Wenn inaktiv: state._last.qhl = qhlRaw (keine Änderung).
import { el } from '../ui.js';
import { SANIERUNGS_MASSNAHMEN } from '../constants.js';
import { qhlNachSanierung } from '../heizlast.js';

export function renderM4(state, onChange) {
  const s = state.m4 ||= {
    aktiv: false,
    // Map massnahmen-id → { enabled, prozent }
    auswahl: Object.fromEntries(SANIERUNGS_MASSNAHMEN.map(m => [m.id, {
      enabled: false, prozent: m.default,
    }])),
  };

  const body = el('div', {});

  // Aktiv-Toggle
  const aktivRow = el('div', { class: 'row', style: { marginBottom: '12px' }},
    el('label', { class: 'field' },
      el('span', {}, 'Sanierung berücksichtigen?'),
      el('select', { onchange: e => { s.aktiv = e.target.value === 'true'; recompute(); onChange?.(); }},
        el('option', { value: 'false' }, 'nein – Qhl unverändert'),
        el('option', { value: 'true' },  'ja – Qhl multiplikativ reduzieren'))),
  );
  aktivRow.querySelector('select').value = String(s.aktiv);
  body.appendChild(aktivRow);

  body.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--mid-gray)', marginBottom: '8px' }},
    'Richtwerte aus FWS M3 §6 (Einsparungs-Bandbreiten). Schieber bleibt innerhalb des Bands, Slider für Feinjustierung.'));

  // Massnahmen-Liste
  const listWrap = el('div', { class: 'dyn-list' });

  SANIERUNGS_MASSNAHMEN.forEach(m => {
    const entry = s.auswahl[m.id];
    const item = el('div', { class: 'dyn-item' });
    const inner = el('div', { class: 'inner' });
    const chkField = el('label', { class: 'field' },
      el('span', {}, m.label),
      el('select', { onchange: e => { entry.enabled = e.target.value === 'true'; recompute(); onChange?.(); }},
        el('option', { value: 'false' }, 'aus'),
        el('option', { value: 'true'  }, 'aktiv')));
    chkField.querySelector('select').value = String(entry.enabled);

    const prozField = el('label', { class: 'field' },
      el('span', {}, `Einsparung (${m.einsparung[0]}–${m.einsparung[1]} %)`),
      el('div', { class: 'input-group' },
        el('input', {
          type: 'number', value: entry.prozent, min: m.einsparung[0], max: m.einsparung[1], step: '1',
          oninput: e => {
            const v = parseFloat(e.target.value) || 0;
            entry.prozent = Math.max(m.einsparung[0], Math.min(m.einsparung[1], v));
            recompute(); onChange?.();
          }}),
        el('span', { class: 'unit' }, '%')));

    inner.appendChild(chkField);
    inner.appendChild(prozField);
    item.appendChild(inner);
    listWrap.appendChild(item);
  });
  body.appendChild(listWrap);

  const mount = el('div', { id: 'm4-result', style: { marginTop: '14px' }});
  body.appendChild(mount);
  // Kundenansicht – qualitative Beschreibung
  const mountKunde = el('div', { id: 'm4-kunde' });
  body.appendChild(mountKunde);

  function grad(m, prozent) {
    const span = m.einsparung[1] - m.einsparung[0];
    const rel = span > 0 ? (prozent - m.einsparung[0]) / span : 0;
    if (rel < 0.34) return 'teilweise wirksam';
    if (rel < 0.67) return 'wirksam';
    return 'umfassend wirksam';
  }

  function recompute() {
    mount.innerHTML = '';
    mountKunde.innerHTML = '';
    const qhlRaw = state._last?.qhlRaw;
    if (!qhlRaw) {
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px' }},
        'Qhl aus M2 erforderlich.'));
      if (state._last) state._last.qhl = state._last.qhlRaw;
      return;
    }

    if (!s.aktiv) {
      // Sanierung inaktiv → Qhl = Qhl,Raw
      state._last.qhl = qhlRaw;
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px' }},
        `Sanierung inaktiv — Qhl unverändert (${qhlRaw.toFixed(2)} kW).`));
      mountKunde.appendChild(el('div', {}, 'Keine zusätzlichen Sanierungsmassnahmen in der Berechnung berücksichtigt (Verbrauchs-Basis entspricht dem Ist-Zustand).'));
      return;
    }

    const massnahmen = SANIERUNGS_MASSNAHMEN
      .filter(m => s.auswahl[m.id].enabled)
      .map(m => ({ id: m.id, label: m.label, einsparungProzent: s.auswahl[m.id].prozent }));

    if (massnahmen.length === 0) {
      state._last.qhl = qhlRaw;
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px' }},
        'Keine Massnahme aktiviert — Qhl unverändert.'));
      return;
    }

    const r = qhlNachSanierung(qhlRaw, massnahmen);
    state._last.qhl = r.wert;

    mount.appendChild(el('div', { class: 'result-card' },
      el('div', {},
        el('div', { class: 'label' }, `Qhl nach Sanierung (−${r.einsparungProzent.toFixed(1)} %)`),
        el('div', { class: 'value' }, `${r.wert.toFixed(2)} kW`))));
    mount.appendChild(el('details', { class: 'steps' },
      el('summary', {}, 'Rechenweg'),
      el('div', { class: 'steps-list' },
        ...r.steps.map(st => el('div', { class: 'step' },
          el('span', { class: 'left' }, st.formel),
          el('span', { class: 'right' }, st.wert || ''))))));

    // Kundenansicht (Klartext, keine Prozentwerte)
    const mMap = new Map(SANIERUNGS_MASSNAHMEN.map(m => [m.id, m]));
    const lines = massnahmen.map(ma => {
      const m = mMap.get(ma.id);
      return `· ${m.label} – ${grad(m, ma.einsparungProzent)}`;
    });
    mountKunde.appendChild(el('div', {},
      el('div', { style: { fontWeight: 500, marginBottom: '6px' }}, 'In die Auslegung einbezogene Sanierungsmassnahmen:'),
      el('div', { style: { whiteSpace: 'pre-line', lineHeight: '1.5' }}, lines.join('\n')),
      el('div', { style: { marginTop: '8px' }},
        `Nach Berücksichtigung dieser Massnahmen beträgt die dimensionsrelevante Heizlast `,
        el('strong', {}, `${r.wert.toFixed(2)} kW`),
        ` (Reduktion gegenüber Ist-Zustand gemäss anerkannten Erfahrungswerten FWS M3 §6).`)));
  }

  body._recompute = recompute;
  setTimeout(recompute, 0);
  return body;
}
