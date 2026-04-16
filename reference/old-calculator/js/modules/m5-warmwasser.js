// Modul M5 – Warmwasser komplett:
//   (a) aus Personen/Wohnflächen (SIA 385/2 Standard-Tabelle + np-Formel)
//   (b) aus V[l/d] direkt
//   (c) aus Messwert Qn,WW [kWh/a]
//   + Verluste-Block (Speicher/Zirkulation/Ausstoss, Methoden-Picker)
//   → liefert QW,u, QWW/d, Qn,WW/a, und Leistungszuschlag Qw

import { el } from '../ui.js';
import { WW_STANDARDS, PHYSIK } from '../constants.js';
import { qwuTag, qnwwJahr, qwwTag, qw as qwCalc, personenbelegung } from '../heizlast.js';

export function renderM5(state, onChange) {
  const s = state.m5 ||= {
    aktiv:   true,                       // WW via Heizungs-WP berechnen?
    methode: 'personen',                 // personen | direkt | messung
    // (a) Personen-Methode
    einheiten: [{ anf: 150, vwuiId: 0, vwui: WW_STANDARDS[0].vwu, npAuto: true, npManuell: '' }],
    // (b) direkt
    vwuDirekt: '',
    // (c) Messwert
    qnwwMess: '',
    // Verluste
    verluste: { speicher: 10, zirk: 0,   ausstoss: 15,
                speicherMethode: 'prozent', zirkMethode: 'keine' },
  };

  const body = el('div', {});

  // Aktivierungs-Toggle
  const aktivRow = el('div', { class: 'row', style: { marginBottom: '14px' }},
    el('label', { class: 'field' },
      el('span', {}, 'Warmwasserbereitung über Heizungs-WP?'),
      el('select', { onchange: e => { s.aktiv = e.target.value === 'true'; render(); }},
        el('option', { value: 'true'  }, 'ja – Qw-Zuschlag rechnen'),
        el('option', { value: 'false' }, 'nein – separat (WP-Boiler / Elektro)'))),
  );
  aktivRow.querySelector('select').value = String(s.aktiv);
  body.appendChild(aktivRow);

  const content = el('div', {});
  body.appendChild(content);

  // Tabs
  const tabs = el('div', { class: 'tabs' });
  const panels = el('div', {});
  const methoden = [
    { id: 'personen', label: 'Aus Personen / Wohnflächen' },
    { id: 'direkt',   label: 'V [l/d] direkt' },
    { id: 'messung',  label: 'Messwert [kWh/a]' },
  ];
  methoden.forEach(m => {
    const btn = el('button', { class: s.methode === m.id ? 'active' : '',
      onclick: () => { s.methode = m.id; switchTab(); recompute(); }}, m.label);
    tabs.appendChild(btn);
    panels.appendChild(el('div', { class: 'tab-panel' + (s.methode === m.id ? ' active' : ''), 'data-tab': m.id }));
  });
  function switchTab() {
    tabs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', methoden[i].id === s.methode));
    panels.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === s.methode));
  }

  content.appendChild(tabs);
  content.appendChild(panels);

  // === Panel (a) Personen ===
  const panelA = panels.querySelector('[data-tab="personen"]');
  const listA  = el('div', { class: 'dyn-list' });
  const addBtn = el('button', { class: 'dyn-add', onclick: () => {
    s.einheiten.push({ anf: 100, vwuiId: 0, vwui: WW_STANDARDS[0].vwu, npAuto: true, npManuell: '' });
    renderEinheiten(); recompute();
  }}, '+ Wohneinheit hinzufügen');

  const totalRow = el('div', { style: { marginTop: '8px', fontSize: '12px', color: 'var(--mid-gray)' }});

  function renderEinheiten() {
    listA.innerHTML = '';
    s.einheiten.forEach((e, idx) => {
      const np = e.npAuto ? personenbelegung(parseFloat(e.anf) || 0).wert : (parseFloat(e.npManuell) || 0);
      const v  = np * parseFloat(e.vwui);
      const item = el('div', { class: 'dyn-item' },
        el('div', { class: 'inner' },
          el('label', { class: 'field' },
            el('span', {}, `Einheit ${idx + 1} · Wohnfläche ANF`),
            el('div', { class: 'input-group' },
              el('input', { type: 'number', value: e.anf, min: '10',
                oninput: ev => { e.anf = parseFloat(ev.target.value) || 0; renderEinheiten(); recompute(); }}),
              el('span', { class: 'unit' }, 'm²'))),
          el('label', { class: 'field' },
            el('span', {}, 'Standard (l/P·Tag)'),
            el('select', { onchange: ev => {
              e.vwuiId = parseInt(ev.target.value);
              e.vwui = WW_STANDARDS[e.vwuiId].vwu;
              renderEinheiten(); recompute();
            }},
              ...WW_STANDARDS.map((w, i) =>
                el('option', { value: i, ...(i === e.vwuiId ? { selected: 'selected' } : {}) },
                  `${w.label} (${w.vwu} l)`)))),
          el('label', { class: 'field' },
            el('span', {}, 'Personen np',
              el('small', {}, e.npAuto ? ' (auto aus ANF)' : ' (manuell)')),
            el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' }},
              el('input', { type: 'number', value: e.npAuto ? np.toFixed(2) : e.npManuell,
                readonly: e.npAuto ? true : null, step: '0.1',
                oninput: ev => { e.npManuell = parseFloat(ev.target.value) || 0; recompute(); }}),
              el('button', { class: 'ghost', style: { padding: '4px 8px', fontSize: '11px' },
                onclick: () => { e.npAuto = !e.npAuto; if (!e.npAuto && !e.npManuell) e.npManuell = np.toFixed(2); renderEinheiten(); recompute(); }},
                e.npAuto ? 'manuell' : 'auto'))),
          el('div', { class: 'field', style: { fontSize: '12px', color: 'var(--mid-gray)', justifyContent: 'flex-end' }},
            el('span', {}, `→ ${v.toFixed(1)} l/Tag`)),
        ),
        s.einheiten.length > 1
          ? el('button', { class: 'dyn-item-remove', onclick: () => {
              s.einheiten.splice(idx, 1); renderEinheiten(); recompute();
            }}, '×')
          : null,
      );
      listA.appendChild(item);
    });
  }

  panelA.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--mid-gray)', marginBottom: '8px' }},
    'Formel SIA 385/2: np = 3.3 − 2 / (1 + (ANF/100)³). np kann manuell überschrieben werden (z. B. bei bekannter Belegung).'));
  panelA.appendChild(listA);
  panelA.appendChild(addBtn);
  panelA.appendChild(totalRow);
  renderEinheiten();

  // === Panel (b) V direkt ===
  const panelB = panels.querySelector('[data-tab="direkt"]');
  panelB.appendChild(el('div', { class: 'row' },
    el('label', { class: 'field' },
      el('span', {}, 'Warmwasserverbrauch VW,u'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.vwuDirekt, placeholder: 'z. B. 160',
          oninput: e => { s.vwuDirekt = parseFloat(e.target.value) || ''; recompute(); }}),
        el('span', { class: 'unit' }, 'l/Tag'))),
  ));

  // === Panel (c) Messwert ===
  const panelC = panels.querySelector('[data-tab="messung"]');
  panelC.appendChild(el('div', { class: 'row' },
    el('label', { class: 'field' },
      el('span', {}, 'Qn,WW Messwert'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.qnwwMess, placeholder: 'z. B. 20000',
          oninput: e => { s.qnwwMess = parseFloat(e.target.value) || ''; recompute(); }}),
        el('span', { class: 'unit' }, 'kWh/a'))),
  ));

  // Verluste-Block
  const verlBlock = el('div', { style: { marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border)' }},
    el('div', { style: { fontSize: '13px', fontWeight: '500', color: 'var(--navy)', marginBottom: '10px' }}, 'Verluste'),
  );
  verlBlock.appendChild(el('div', { class: 'row row-3' },
    el('label', { class: 'field' },
      el('span', {}, 'Speicher-Verluste'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.verluste.speicher, step: '1',
          oninput: e => { s.verluste.speicher = parseFloat(e.target.value) || 0; recompute(); }}),
        el('span', { class: 'unit' }, '% von QW,u'))),
    el('label', { class: 'field' },
      el('span', {}, 'Zirkulations-Verluste'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.verluste.zirk, step: '1',
          oninput: e => { s.verluste.zirk = parseFloat(e.target.value) || 0; recompute(); }}),
        el('span', { class: 'unit' }, '% von QW,u'))),
    el('label', { class: 'field' },
      el('span', {}, 'Ausstoss-Verluste'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.verluste.ausstoss, step: '1',
          oninput: e => { s.verluste.ausstoss = parseFloat(e.target.value) || 0; recompute(); }}),
        el('span', { class: 'unit' }, '% von QW,u'))),
  ));
  verlBlock.appendChild(el('div', { style: { marginTop: '6px', fontSize: '11px', color: 'var(--mid-gray)' }},
    'Richtwerte FWS M3 §8: Speicher 8–10 %, Zirkulation 10–15 % (Länge unbekannt) oder 0 (keine Warmhaltung / Elektroheizband = nicht rechnen), Ausstoss 15–20 %.'));
  content.appendChild(verlBlock);

  // Ergebnis-Mount
  const mount = el('div', { id: 'm5-result', style: { marginTop: '16px' }});
  body.appendChild(mount);

  function render() {
    // Aktiv/Inaktiv Anzeige
    content.style.display = s.aktiv ? '' : 'none';
    mount.innerHTML = '';
    if (!s.aktiv) {
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px', marginTop: '8px' }},
        'Warmwasser wird separat erzeugt (z. B. WP-Boiler oder Elektro). Kein Qw-Zuschlag.'));
      state._lastQw = null;
      state._lastWW = null;
      onChange?.();
      return;
    }
    recompute();
  }

  function recompute() {
    if (!s.aktiv) { state._lastQw = null; state._lastWW = null; return; }

    let vwu = null;          // l/d
    let qwuRes = null;       // {wert, einheit, steps}
    let qnwwRes = null;      // kWh/a
    let qwwRes = null;       // kWh/d

    if (s.methode === 'personen') {
      vwu = s.einheiten.reduce((sum, e) => {
        const np = e.npAuto ? personenbelegung(parseFloat(e.anf) || 0).wert : (parseFloat(e.npManuell) || 0);
        return sum + np * parseFloat(e.vwui || 0);
      }, 0);
      totalRow.textContent = vwu > 0 ? `Σ VW,u = ${vwu.toFixed(1)} l/Tag` : '';
    } else if (s.methode === 'direkt' && parseFloat(s.vwuDirekt) > 0) {
      vwu = parseFloat(s.vwuDirekt);
    } else if (s.methode === 'messung' && parseFloat(s.qnwwMess) > 0) {
      qnwwRes = { wert: parseFloat(s.qnwwMess), einheit: 'kWh/a',
                  steps: [{ formel: 'Messwert Qn,WW', wert: `${s.qnwwMess} kWh/a` }]};
    }

    if (vwu > 0) {
      qwuRes  = qwuTag(vwu);
      qnwwRes = qnwwJahr(vwu, {
        speicher: s.verluste.speicher / 100,
        zirk:     s.verluste.zirk     / 100,
        ausstoss: s.verluste.ausstoss / 100,
      });
      qwwRes = qwwTag(qwuRes.wert, {
        speicherProzent: s.verluste.speicher,
        zirkProzent:     s.verluste.zirk,
        ausstossProzent: s.verluste.ausstoss,
      });
    } else if (qnwwRes) {
      // Messwert → QWW/Tag = Qn,WW / 365
      const qwwTagWert = qnwwRes.wert / 365;
      qwwRes = { wert: qwwTagWert, einheit: 'kWh/d',
                 steps: [{ formel: 'QWW = Qn,WW / 365', wert: `${qnwwRes.wert.toFixed(0)} / 365 = ${qwwTagWert.toFixed(2)} kWh/d` }]};
    }

    // Qw-Zuschlag
    let qwRes = null;
    const qhl = state._last?.qhl;
    if (qhl && qwwRes) qwRes = qwCalc(qhl, qwwRes.wert);

    // Ausgabe
    mount.innerHTML = '';
    if (qwuRes) mount.appendChild(stepsCard('Nutzenergie Warmwasser QW,u', qwuRes, 'kWh/d', 2));
    if (qnwwRes && s.methode !== 'messung') mount.appendChild(stepsCard('Qn,WW (Jahresenergie inkl. Verluste)', qnwwRes, 'kWh/a', 0));
    if (qwwRes) mount.appendChild(stepsCard('QWW gesamt pro Tag', qwwRes, 'kWh/d', 2));
    if (qwRes) {
      mount.appendChild(el('div', { class: 'result-card', style: { marginTop: '10px' }},
        el('div', {},
          el('div', { class: 'label' }, 'Leistungszuschlag Warmwasser Qw'),
          el('div', { class: 'value' }, `${qwRes.wert.toFixed(2)} kW`))));
      mount.appendChild(renderStepsDetails(qwRes));
    } else if (qwwRes && !qhl) {
      mount.appendChild(el('div', { class: 'hinweis' }, 'Qhl aus M2 erforderlich, um Qw zu berechnen.'));
    }

    state._lastWW = { vwu, qwuTag: qwuRes?.wert, qwwTag: qwwRes?.wert, qnwwJahr: qnwwRes?.wert };
    state._lastQw = qwRes ? { qw: qwRes.wert, td: qwRes.td } : null;

    onChange?.();
  }

  function stepsCard(label, res, _unit, decimals = 2) {
    const wrap = el('div', { style: { marginBottom: '10px' }});
    wrap.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--mid-gray)', marginBottom: '4px' }}, label));
    wrap.appendChild(el('div', { style: { fontSize: '15px', color: 'var(--navy)', fontWeight: 500 }},
      `${res.wert.toLocaleString('de-CH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${res.einheit}`));
    wrap.appendChild(renderStepsDetails(res));
    return wrap;
  }

  function renderStepsDetails(res) {
    if (!res.steps) return null;
    return el('details', { class: 'steps' },
      el('summary', {}, 'Rechenweg'),
      el('div', { class: 'steps-list' },
        ...res.steps.map(st => el('div', { class: 'step' },
          el('span', { class: 'left' }, st.formel),
          el('span', { class: 'right' }, st.wert || '')))));
  }

  body._recompute = recompute;
  setTimeout(render, 0);
  return body;
}
