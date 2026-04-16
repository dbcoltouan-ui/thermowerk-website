// Modul M2 – Norm-Heizlast Qhl mit 5 Eingangs-Methoden als Tabs:
//   (a) aus Brennstoffverbrauch (1–n Träger, bivalent)
//   (b) aus Messwert Nutzenergie (kWh/a)
//   (c) aus Betriebsstundenzähler WP
//   (d) aus Bauperiode + EBF (Schätzband)
//   (f) Fester Qhl-Override
import { el } from '../ui.js';
import { BRENNWERTE, WIRKUNGSGRADE, BAUPERIODEN } from '../constants.js';
import {
  qnAusVerbrauch, qnSumme, qhlAusQn, qhlAusBauperiode,
  qnAusBetriebsstunden, qnwwJahr,
} from '../heizlast.js';

export function renderM2(state, onChange) {
  const s = state.m2 ||= {
    methode: 'verbrauch',                // a|b|c|d|f
    traeger: [
      { energietraeger: 'oel', verbrauch: '', ho: BRENNWERTE.oel.ho, eta: 0.85 },
    ],
    inklWW: false,
    vwuFuerAbzug: '',                    // l/d falls inklWW
    verlusteFuerAbzug: { speicher: 10, zirk: 0, ausstoss: 15 },
    qnMess: '',                          // (b)
    stundenGesamt: '',                   // (c)
    jahreBetrieb: '',                    // (c)
    qhWP: '',                            // (c)
    // (d) greift auf state.m1 zurück
    qhlOverride: '',                     // (f)
  };

  const body = el('div', {});

  // Tabs
  const tabs = el('div', { class: 'tabs' });
  const panels = el('div', {});
  const methoden = [
    { id: 'verbrauch', label: 'Brennstoffverbrauch' },
    { id: 'messung',   label: 'Messwert' },
    { id: 'bstd',      label: 'Betriebsstunden-Rückrechnung' },
    { id: 'bauperiode', label: 'Bauperiode + EBF' },
    { id: 'override',  label: 'Fester Wert' },
  ];
  methoden.forEach(m => {
    const btn = el('button', {
      class: s.methode === m.id ? 'active' : '',
      onclick: () => switchTab(m.id),
    }, m.label);
    tabs.appendChild(btn);
    const panel = el('div', { class: 'tab-panel' + (s.methode === m.id ? ' active' : ''), 'data-tab': m.id });
    panels.appendChild(panel);
  });

  function switchTab(id) {
    s.methode = id;
    tabs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', methoden[i].id === id));
    panels.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === id));
    recompute();
  }

  // === Panel (a) Brennstoffverbrauch ===
  const panelA = panels.querySelector('[data-tab="verbrauch"]');
  const listA = el('div', { class: 'dyn-list' });
  const addBtn = el('button', { class: 'dyn-add', onclick: () => {
    s.traeger.push({ energietraeger: 'oel', verbrauch: '', ho: BRENNWERTE.oel.ho, eta: 0.85 });
    renderTraegerList();
    recompute();
  }}, '+ Energieträger hinzufügen');

  const wwToggle = el('label', { class: 'field' },
    el('span', {}, 'Verbrauch inklusive Warmwasser?'),
    el('select', { onchange: e => { s.inklWW = e.target.value === 'true'; renderWWBlock(); recompute(); }},
      el('option', { value: 'false' }, 'nein – Heizung only'),
      el('option', { value: 'true' },  'ja – WW-Anteil wird abgezogen')),
  );
  wwToggle.querySelector('select').value = String(s.inklWW);

  const wwBlock = el('div', {});

  function renderWWBlock() {
    wwBlock.innerHTML = '';
    if (!s.inklWW) return;
    wwBlock.appendChild(el('div', { class: 'row row-3' },
      el('label', { class: 'field' },
        el('span', {}, 'WW-Verbrauch VW,u'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.vwuFuerAbzug, oninput: e => { s.vwuFuerAbzug = e.target.value === '' ? '' : parseFloat(e.target.value); recompute(); }}),
          el('span', { class: 'unit' }, 'l/d'))),
      el('label', { class: 'field' },
        el('span', {}, 'Speicher-Verluste'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.verlusteFuerAbzug.speicher, oninput: e => { s.verlusteFuerAbzug.speicher = parseFloat(e.target.value) || 0; recompute(); }}),
          el('span', { class: 'unit' }, '%'))),
      el('label', { class: 'field' },
        el('span', {}, 'Ausstoss-Verluste'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.verlusteFuerAbzug.ausstoss, oninput: e => { s.verlusteFuerAbzug.ausstoss = parseFloat(e.target.value) || 0; recompute(); }}),
          el('span', { class: 'unit' }, '%'))),
    ));
    wwBlock.appendChild(el('div', { class: 'row' },
      el('label', { class: 'field' },
        el('span', {}, 'Zirkulations-Verluste'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.verlusteFuerAbzug.zirk, oninput: e => { s.verlusteFuerAbzug.zirk = parseFloat(e.target.value) || 0; recompute(); }}),
          el('span', { class: 'unit' }, '%'))),
    ));
  }

  function renderTraegerList() {
    listA.innerHTML = '';
    s.traeger.forEach((t, idx) => {
      const etDef = BRENNWERTE[t.energietraeger] || BRENNWERTE.oel;
      const item = el('div', { class: 'dyn-item' },
        el('div', { class: 'inner' },
          el('label', { class: 'field' },
            el('span', {}, 'Energieträger'),
            el('select', { onchange: e => {
              t.energietraeger = e.target.value;
              t.ho = BRENNWERTE[t.energietraeger].ho;
              renderTraegerList(); recompute();
            }},
              ...Object.entries(BRENNWERTE).map(([k, v]) =>
                el('option', { value: k, ...(k === t.energietraeger ? { selected: 'selected' } : {}) }, v.label)))),
          el('label', { class: 'field' },
            el('span', {}, 'Jahresverbrauch'),
            el('div', { class: 'input-group' },
              el('input', { type: 'number', value: t.verbrauch, placeholder: '0',
                oninput: e => { t.verbrauch = e.target.value === '' ? '' : parseFloat(e.target.value); recompute(); }}),
              el('span', { class: 'unit' }, etDef.verbrauchEinheit))),
          el('label', { class: 'field' },
            el('span', {}, 'Brennwert Ho'),
            el('div', { class: 'input-group' },
              el('input', { type: 'number', value: t.ho, step: '0.1',
                oninput: e => { t.ho = parseFloat(e.target.value) || 0; recompute(); }}),
              el('span', { class: 'unit' }, etDef.einheit))),
          el('label', { class: 'field' },
            el('span', {}, 'Jahresnutzungsgrad η'),
            el('input', { type: 'number', value: t.eta, step: '0.01', min: '0', max: '1',
              oninput: e => { t.eta = parseFloat(e.target.value) || 0; recompute(); }})),
        ),
        s.traeger.length > 1
          ? el('button', { class: 'dyn-item-remove', title: 'Entfernen',
              onclick: () => { s.traeger.splice(idx, 1); renderTraegerList(); recompute(); }}, '×')
          : null,
      );
      listA.appendChild(item);
    });
    // η-Hilfe
    const hilfe = el('details', { class: 'steps' },
      el('summary', {}, 'η-Richtwerte (klicken zum Übernehmen)'),
      el('div', { class: 'steps-list' },
        ...WIRKUNGSGRADE.map(w => el('div', { class: 'step' },
          el('span', { class: 'left' }, w.label),
          el('span', { class: 'right' }, `${w.min}–${w.max}`)))));
    listA.appendChild(hilfe);
  }

  panelA.appendChild(wwToggle);
  panelA.appendChild(wwBlock);
  panelA.appendChild(el('div', { style: { marginTop: '12px', fontSize: '12px', color: 'var(--mid-gray)' }},
    'Bivalente Anlagen: mehrere Träger hinzufügen, Nutzenergien werden addiert.'));
  panelA.appendChild(listA);
  panelA.appendChild(addBtn);
  renderTraegerList();
  renderWWBlock();

  // === Panel (b) Messwert ===
  const panelB = panels.querySelector('[data-tab="messung"]');
  panelB.appendChild(el('div', { class: 'row' },
    el('label', { class: 'field' },
      el('span', {}, 'Nutzenergie Heizung (gemessen)'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.qnMess, placeholder: 'z. B. 23000',
          oninput: e => { s.qnMess = e.target.value === '' ? '' : parseFloat(e.target.value); recompute(); }}),
        el('span', { class: 'unit' }, 'kWh/a'))),
  ));

  // === Panel (c) Betriebsstunden ===
  const panelC = panels.querySelector('[data-tab="bstd"]');
  panelC.appendChild(el('div', { class: 'row row-3' },
    el('label', { class: 'field' },
      el('span', {}, 'Betriebsstundenzähler'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.stundenGesamt,
          oninput: e => { s.stundenGesamt = parseFloat(e.target.value) || ''; recompute(); }}),
        el('span', { class: 'unit' }, 'h'))),
    el('label', { class: 'field' },
      el('span', {}, 'Betriebsdauer'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.jahreBetrieb,
          oninput: e => { s.jahreBetrieb = parseFloat(e.target.value) || ''; recompute(); }}),
        el('span', { class: 'unit' }, 'Jahre'))),
    el('label', { class: 'field' },
      el('span', {}, 'Heizleistung WP (BO/W35 o.ä.)'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.qhWP, step: '0.1',
          oninput: e => { s.qhWP = parseFloat(e.target.value) || ''; recompute(); }}),
        el('span', { class: 'unit' }, 'kW'))),
  ));

  // === Panel (d) Bauperiode ===
  const panelD = panels.querySelector('[data-tab="bauperiode"]');
  panelD.appendChild(el('div', { style: { fontSize: '13px', color: 'var(--mid-gray)' }},
    'Übernimmt Bauperiode und EBF aus Stammdaten (M1) und berechnet Schätzband anhand §6.'));

  // === Panel (f) Override ===
  const panelF = panels.querySelector('[data-tab="override"]');
  panelF.appendChild(el('div', { class: 'row' },
    el('label', { class: 'field' },
      el('span', {}, 'Qhl (z. B. aus SIA 384/1-Berechnung)'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.qhlOverride, step: '0.1', placeholder: 'z. B. 12.5',
          oninput: e => { s.qhlOverride = parseFloat(e.target.value) || ''; recompute(); }}),
        el('span', { class: 'unit' }, 'kW'))),
  ));

  body.appendChild(tabs);
  body.appendChild(panels);

  const resultMount = el('div', { id: 'm2-result' });
  body.appendChild(resultMount);

  function recompute() {
    const m1 = state.m1 || {};
    const tvoll = m1.tvoll || 2000;
    let qn = null, qhl = null;

    if (s.methode === 'verbrauch') {
      const qnTeile = s.traeger
        .filter(t => parseFloat(t.verbrauch) > 0)
        .map(t => qnAusVerbrauch(parseFloat(t.verbrauch), parseFloat(t.ho), parseFloat(t.eta),
                                 { label: BRENNWERTE[t.energietraeger]?.label, trennerEinheit: BRENNWERTE[t.energietraeger]?.verbrauchEinheit }));
      if (qnTeile.length === 0) { render(null, null, null); return; }
      const qnGes = qnTeile.length > 1 ? qnSumme(qnTeile) : qnTeile[0];

      let qnH = qnGes;
      let qnWwRes = null;
      if (s.inklWW && parseFloat(s.vwuFuerAbzug) > 0) {
        qnWwRes = qnwwJahr(parseFloat(s.vwuFuerAbzug), {
          speicher: s.verlusteFuerAbzug.speicher / 100,
          zirk:     s.verlusteFuerAbzug.zirk     / 100,
          ausstoss: s.verlusteFuerAbzug.ausstoss / 100,
        });
        qnH = { ...qnGes, wert: qnGes.wert - qnWwRes.wert, steps: [
          ...qnGes.steps,
          { formel: '− Qn,WW', wert: `− ${qnWwRes.wert.toFixed(0)} kWh/a` },
          { formel: 'Qn,H', wert: `${(qnGes.wert - qnWwRes.wert).toFixed(0)} kWh/a` },
        ] };
      }
      qhl = qhlAusQn(qnH.wert, tvoll);
      render(qnGes, qnH, qhl, qnWwRes);
      state._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: qnH.wert, qnWW: qnWwRes?.wert ?? null };
    }
    else if (s.methode === 'messung' && parseFloat(s.qnMess) > 0) {
      qhl = qhlAusQn(parseFloat(s.qnMess), tvoll);
      render(null, { wert: parseFloat(s.qnMess), einheit: 'kWh/a', steps: [{ formel: 'Messwert Qn,H', wert: `${s.qnMess} kWh/a` }]}, qhl);
      state._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: parseFloat(s.qnMess), qnWW: null };
    }
    else if (s.methode === 'bstd' && parseFloat(s.stundenGesamt) > 0 && parseFloat(s.jahreBetrieb) > 0 && parseFloat(s.qhWP) > 0) {
      qn = qnAusBetriebsstunden(parseFloat(s.stundenGesamt), parseFloat(s.jahreBetrieb), parseFloat(s.qhWP));
      qhl = qhlAusQn(qn.wert, tvoll);
      render(null, qn, qhl);
      state._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: qn.wert, qnWW: null };
    }
    else if (s.methode === 'bauperiode' && m1.bauperiode && parseFloat(m1.ebf) > 0) {
      const g = m1.gebaeudetyp === 'mfh' ? 'mfh' : 'efh';
      qhl = qhlAusBauperiode(m1.bauperiode, g, parseFloat(m1.ebf), tvoll);
      render(null, null, qhl);
      state._last = { qhl: qhl?.wert, qhlRaw: qhl?.wert, qnH: null, qnWW: null };
    }
    else if (s.methode === 'override' && parseFloat(s.qhlOverride) > 0) {
      qhl = { wert: parseFloat(s.qhlOverride), einheit: 'kW', steps: [{ formel: 'Fester Wert (Override)', wert: `${s.qhlOverride} kW` }]};
      render(null, null, qhl);
      state._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: null, qnWW: null };
    }
    else {
      render(null, null, null);
      state._last = {};
    }
    onChange?.();
  }

  function render(qnGes, qnH, qhl, qnWw) {
    resultMount.innerHTML = '';
    if (!qhl) {
      resultMount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px', marginTop: '10px' }},
        'Eingaben ergänzen, um die Heizlast zu berechnen.'));
      return;
    }
    if (qnGes) resultMount.appendChild(stepsCard('Nutzenergie Total', qnGes));
    if (qnWw)  resultMount.appendChild(stepsCard('Abgezogene Nutzenergie Warmwasser', qnWw));
    if (qnH)   resultMount.appendChild(stepsCard('Nutzenergie Heizung', qnH));
    resultMount.appendChild(mainCard('Norm-Heizlast Qhl', qhl));

    // tvoll-Hinweis
    const m1 = state.m1 || {};
    const tv = m1.tvoll || 2000;
    const modusTxt = m1.tvollModus === 'manuell'
      ? `manueller Override`
      : (m1.gebaeudetyp === 'buero' ? 'Büro/Gewerbe' : 'Wohnen ohne WW')
        + `, ${m1.lage === 'hoehe' ? '≥ 800 m ü. M.' : 'Mittelland'}`;
    resultMount.appendChild(el('div', { class: 'hinweis', style: { marginTop: '8px' }},
      `Verwendet tvoll = ${tv} h/a (${modusTxt}). Warmwasser wird in M5 separat als Zuschlag Qw gerechnet.`));
  }

  function stepsCard(label, res) {
    return el('div', { style: { marginTop: '10px' }},
      el('div', { style: { fontSize: '12px', color: 'var(--mid-gray)', marginBottom: '4px' }}, label),
      el('div', { style: { fontSize: '15px', color: 'var(--navy)', fontWeight: 500 }},
        `${res.wert.toLocaleString('de-CH', { maximumFractionDigits: 0 })} ${res.einheit}`),
      renderStepsDetails(res),
    );
  }

  function mainCard(label, res) {
    const card = el('div', { class: 'result-card highlight' },
      el('div', {},
        el('div', { class: 'label' }, label),
        el('div', { class: 'value' },
          `${res.wert.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${res.einheit}`)));
    const wrap = el('div', { style: { marginTop: '14px' }}, card, renderStepsDetails(res));
    if (res.range) wrap.appendChild(el('div', { class: 'hinweis' },
      `Schätzband: ${res.range[0].toFixed(2)} – ${res.range[1].toFixed(2)} kW`));
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

  setTimeout(recompute, 0);
  body._recompute = recompute;
  return body;
}
