// Modul M9 – Heizungs-Pufferspeicher
// Quellen: SWKI BT 102-01, VDI 4645, WP-Herstellerhandbücher.
// NICHT in FWS M3 enthalten (§19 nur qualitativ) – Quellenhinweis bleibt immer sichtbar.
// Tool nimmt das Maximum aller zutreffenden Kriterien.

import { el } from '../ui.js';
import { HEIZPUFFER } from '../constants.js';
import { puffer_abtau, puffer_takt, puffer_err, puffer_sperrzeit } from '../heizlast.js';

export function renderM9(state) {
  const s = state.m9 ||= {
    wpTyp:        'lw_abtau',
    err:          true,
    inverter:     true,
    qwpManuell:   '',            // leer = Qh aus M7
    toffManuell:  '',            // leer = toff aus M6
    abtauMin:     HEIZPUFFER.abtauZeitMin,
    abtauDeltaT:  HEIZPUFFER.abtauDeltaT,
    taktMin:      HEIZPUFFER.taktZeitMin,
    taktDeltaT:   HEIZPUFFER.taktDeltaT,
    errMin:       HEIZPUFFER.errBand[0],
    errMax:       HEIZPUFFER.errBand[1],
  };

  const body = el('div', {});

  // Warnhinweis Quellen
  body.appendChild(el('div', {
    style: { padding: '10px 12px', background: '#fff8e1', border: '1px solid #f0d68a',
             borderRadius: '6px', fontSize: '12px', color: '#5a4a00', marginBottom: '14px' }
  }, 'Berechnung nicht aus FWS M3 (dort nur qualitativ behandelt). Basis: SWKI BT 102-01, VDI 4645, WP-Hersteller­handbücher. ',
     el('strong', {}, 'Herstellervorgabe der konkret eingesetzten WP ist für die Gewährleistung bindend — immer prüfen.')));

  // Eingaben
  body.appendChild(el('div', { class: 'row row-3' },
    el('label', { class: 'field' },
      el('span', {}, 'WP-Typ'),
      el('select', { onchange: e => { s.wpTyp = e.target.value; recompute(); }},
        ...Object.entries(HEIZPUFFER.typen).map(([id, t]) =>
          el('option', { value: id, ...(id === s.wpTyp ? { selected: 'selected' } : {}) }, t.label)))),
    el('label', { class: 'field' },
      el('span', {}, 'Einzelraumregulierung (ERR)'),
      el('select', { onchange: e => { s.err = e.target.value === 'true'; recompute(); }},
        el('option', { value: 'false' }, 'nein – zentrale Regelung / FBH ohne Stellantriebe'),
        el('option', { value: 'true'  }, 'ja – Thermostatventile / FBH-Stellantriebe'))),
    el('label', { class: 'field' },
      el('span', {}, 'WP-Regelverhalten'),
      el('select', { onchange: e => { s.inverter = e.target.value === 'inverter'; recompute(); }},
        el('option', { value: 'inverter' }, 'Inverter (moduliert)'),
        el('option', { value: 'onoff' },    'On/Off – 1-stufig'))),
  ));

  body.querySelector('select:nth-of-type(1)'); // no-op to avoid lint warning
  body.querySelectorAll('select').forEach((sel) => {
    // ensure selected reflects current state
  });
  // (ERR + Inverter selected handling)
  const [selTyp, selErr, selInv] = body.querySelectorAll('.row.row-3 select');
  selErr.value = String(s.err);
  selInv.value = s.inverter ? 'inverter' : 'onoff';

  body.appendChild(el('div', { class: 'row row-3' },
    el('label', { class: 'field' },
      el('span', {}, 'Q_WP Heizleistung'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.qwpManuell, placeholder: 'leer = Qh aus M7', step: '0.1',
          oninput: e => { s.qwpManuell = e.target.value === '' ? '' : parseFloat(e.target.value); recompute(); }}),
        el('span', { class: 'unit' }, 'kW'))),
    el('label', { class: 'field' },
      el('span', {}, 'Sperrzeit toff'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.toffManuell, placeholder: 'leer = aus M6', step: '0.5',
          oninput: e => { s.toffManuell = e.target.value === '' ? '' : parseFloat(e.target.value); recompute(); }}),
        el('span', { class: 'unit' }, 'h/d'))),
    el('label', { class: 'field' },
      el('span', {}, 'ERR-Band (Herstellerempfehlung)'),
      el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' }},
        el('input', { type: 'number', value: s.errMin, step: '1', style: { width: '60px' },
          oninput: e => { s.errMin = parseFloat(e.target.value) || 15; recompute(); }}),
        el('span', {}, '–'),
        el('input', { type: 'number', value: s.errMax, step: '1', style: { width: '60px' },
          oninput: e => { s.errMax = parseFloat(e.target.value) || 25; recompute(); }}),
        el('span', { class: 'unit' }, 'l/kW'))),
  ));

  // Feintuning (aufklappbar)
  body.appendChild(el('details', { class: 'steps', style: { marginTop: '8px' }},
    el('summary', {}, 'Feintuning (Abtau-/Taktparameter)'),
    el('div', { class: 'row row-3', style: { marginTop: '10px' }},
      el('label', { class: 'field' },
        el('span', {}, 'Abtaudauer'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.abtauMin, step: '1',
            oninput: e => { s.abtauMin = parseFloat(e.target.value) || 5; recompute(); }}),
          el('span', { class: 'unit' }, 'min'))),
      el('label', { class: 'field' },
        el('span', {}, 'Abtau ΔT zulässig'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.abtauDeltaT, step: '0.5',
            oninput: e => { s.abtauDeltaT = parseFloat(e.target.value) || 5; recompute(); }}),
          el('span', { class: 'unit' }, 'K'))),
      el('label', { class: 'field' },
        el('span', {}, 'Takt ΔT'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.taktDeltaT, step: '0.5',
            oninput: e => { s.taktDeltaT = parseFloat(e.target.value) || 5; recompute(); }}),
          el('span', { class: 'unit' }, 'K'))),
    ),
    el('div', { class: 'row' },
      el('label', { class: 'field' },
        el('span', {}, 'Kompressor-Mindestlaufzeit'),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', value: s.taktMin, step: '1',
            oninput: e => { s.taktMin = parseFloat(e.target.value) || 6; recompute(); }}),
          el('span', { class: 'unit' }, 'min'))),
    ),
  ));

  const mount = el('div', { id: 'm9-result', style: { marginTop: '16px' }});
  body.appendChild(mount);

  function recompute() {
    mount.innerHTML = '';
    const qwp = s.qwpManuell !== '' && s.qwpManuell > 0
      ? parseFloat(s.qwpManuell)
      : state._lastQh?.qh;
    const toff = s.toffManuell !== '' && s.toffManuell !== null
      ? parseFloat(s.toffManuell)
      : (state.m6?.toff ?? 0);

    if (!qwp) {
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px' }},
        'Qh aus M7 erforderlich – WP-Auslegung zuerst berechnen.'));
      return;
    }

    const typ = HEIZPUFFER.typen[s.wpTyp];
    const kandidaten = [];

    // (1) Abtauung – nur wenn Typ es braucht
    if (typ.braucht.includes('abtau')) {
      const r = puffer_abtau(qwp, { tMin: s.abtauMin, deltaT: s.abtauDeltaT });
      kandidaten.push({ label: 'Abtauung (Prozessumkehr)', res: r, wert: r.wert });
    }
    // (2) Takt – vor allem bei On/Off
    if (typ.braucht.includes('takt') && !s.inverter) {
      const r = puffer_takt(qwp, { tMin: s.taktMin, deltaT: s.taktDeltaT });
      kandidaten.push({ label: 'Taktschutz (On/Off-Mindestlaufzeit)', res: r, wert: r.wert });
    }
    // (3) ERR-Entkopplung
    if (typ.braucht.includes('err') && s.err) {
      const r = puffer_err(qwp, [s.errMin, s.errMax]);
      kandidaten.push({ label: 'ERR-Entkopplung (Parallelspeicher)', res: r, wert: r.wert });
    }

    // Typ-Sockel (aus Herstellerhandbuch-Konsens)
    const [sockMin, sockMax] = typ.empfehlung;
    kandidaten.push({
      label: `Herstellerkonsens ${typ.label}`,
      res: { wert: qwp * sockMax, einheit: 'l', steps: [
        { formel: `${typ.label}: ${sockMin}–${sockMax} l/kW`, wert: `${(qwp * sockMin).toFixed(0)}…${(qwp * sockMax).toFixed(0)} l` },
      ]},
      wert: qwp * sockMax,
      bandMin: qwp * sockMin,
    });

    // Maximum = Empfehlung
    const empfehlung = kandidaten.reduce((m, k) => k.wert > m.wert ? k : m, kandidaten[0]);

    // Haupt-Kennzahl (Empfehlungsband)
    const untereGrenze = Math.min(...kandidaten.map(k => k.bandMin ?? k.wert));
    const obereGrenze  = empfehlung.wert;
    mount.appendChild(el('div', { class: 'result-card highlight' },
      el('div', {},
        el('div', { class: 'label' }, 'Empfohlenes Puffervolumen (Maximum aller Kriterien)'),
        el('div', { class: 'value' },
          obereGrenze <= untereGrenze
            ? `${obereGrenze.toFixed(0)} l`
            : `${untereGrenze.toFixed(0)} – ${obereGrenze.toFixed(0)} l`))));

    mount.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--mid-gray)', marginTop: '4px' }},
      `Massgebend: ${empfehlung.label}`));

    // Alle Kandidaten einzeln anzeigen
    mount.appendChild(el('div', { style: { marginTop: '14px', fontSize: '13px', fontWeight: 500, color: 'var(--navy)' }},
      'Einzel-Kriterien'));
    kandidaten.forEach(k => {
      const card = el('div', { class: 'result-card', style: { marginTop: '8px' }},
        el('div', {},
          el('div', { class: 'label' }, k.label),
          el('div', { class: 'value' }, `${k.wert.toFixed(0)} l`)),
        k === empfehlung
          ? el('span', { class: 'ampel gruen' }, 'massgebend')
          : el('span', { class: 'ampel grau' }, 'nicht massgebend'),
      );
      mount.appendChild(card);
      if (k.res.steps) {
        mount.appendChild(el('details', { class: 'steps' },
          el('summary', {}, 'Rechenweg'),
          el('div', { class: 'steps-list' },
            ...k.res.steps.map(st => el('div', { class: 'step' },
              el('span', { class: 'left' }, st.formel),
              el('span', { class: 'right' }, st.wert || ''))))));
      }
    });

    // Informativ: Sperrzeit-Überbrückung
    if (toff > 0) {
      const rSperr = puffer_sperrzeit(state._last?.qhl || qwp, toff);
      mount.appendChild(el('div', { style: { marginTop: '14px', fontSize: '13px', fontWeight: 500, color: 'var(--navy)' }},
        'Sperrzeit-Überbrückung (informativ)'));
      mount.appendChild(el('div', { class: 'result-card', style: { marginTop: '8px' }},
        el('div', {},
          el('div', { class: 'label' }, `Vollständige Überbrückung ${toff} h @ ΔT 10 K`),
          el('div', { class: 'value' }, `${rSperr.wert.toFixed(0)} l`)),
        el('span', { class: 'ampel gelb' }, 'meist unrealistisch')));
      mount.appendChild(el('div', { class: 'hinweis' },
        'In der Praxis wird Sperrzeit selten voll abgepuffert (Volumen zu gross). FWS M3 §19 empfiehlt stattdessen: Anlage so auslegen, dass Aussentemperaturzone der Sperrzeiten-Einschränkung akzeptiert wird.'));
    }
  }

  body._recompute = recompute;
  setTimeout(recompute, 0);
  return body;
}
