// Modul M8 – WW-Speicher & Wärmetauscher-Fläche
//   §10 Warmwasser-Speichervolumen
//     10.1 VW,Sto = QWW / (cp · ΔT / 3600)
//     10.2 fsto (1.00 / 1.10 / 1.25 je nach Zonen)
//     10.3 Spitzendeckung (≈ 9–10 % VW,u)
//   §11.2 WT-Fläche Faustformel
//   §8.2 Speicherverluste aus Volumen

import { el } from '../ui.js';
import { FSTO, WT_FAUSTFORMEL, PHYSIK } from '../constants.js';
import { speichervolumen, speicherverlustAusVolumen } from '../heizlast.js';

export function renderM8(state) {
  const s = state.m8 ||= {
    tStoAus:   60,
    tStoEin:   PHYSIK.t_kaltwasser,
    fstoId:    'keine_zonen',
    wtId:      'innen_mitWH',
    wpQuelleKw: '',          // manuell überschreiben (sonst Qh aus M7-State)
  };

  const body = el('div', {});

  // Eingabezeile 1: Temperaturen
  body.appendChild(el('div', { class: 'row row-3' },
    el('label', { class: 'field' },
      el('span', {}, 'Speicheraustrittstemperatur TSto,aus'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.tStoAus, step: '1',
          oninput: e => { s.tStoAus = parseFloat(e.target.value) || 60; recompute(); }}),
        el('span', { class: 'unit' }, '°C'))),
    el('label', { class: 'field' },
      el('span', {}, 'Kaltwassertemperatur TSto,ein'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.tStoEin, step: '1',
          oninput: e => { s.tStoEin = parseFloat(e.target.value) || 10; recompute(); }}),
        el('span', { class: 'unit' }, '°C'))),
    el('label', { class: 'field' },
      el('span', {}, 'Speicher-Konfiguration fsto'),
      el('select', { onchange: e => { s.fstoId = e.target.value; recompute(); }},
        ...FSTO.map(f => el('option', { value: f.id, ...(f.id === s.fstoId ? { selected: 'selected' } : {}) },
          `${f.label} (${f.faktor})`)))),
  ));

  // Zeile 2: WT + WP-Quelle
  body.appendChild(el('div', { class: 'row' },
    el('label', { class: 'field' },
      el('span', {}, 'Wärmetauscher-System (§11)'),
      el('select', { onchange: e => { s.wtId = e.target.value; recompute(); }},
        ...WT_FAUSTFORMEL.map(w => el('option', { value: w.id, ...(w.id === s.wtId ? { selected: 'selected' } : {}) },
          `${w.label} — ${w.mPerKw} m²/kW`)))),
    el('label', { class: 'field' },
      el('span', {}, 'WP-Heizleistung (Basis WT-Fläche)'),
      el('div', { class: 'input-group' },
        el('input', { type: 'number', value: s.wpQuelleKw, placeholder: 'leer = Qh aus M7',
          step: '0.1',
          oninput: e => { s.wpQuelleKw = e.target.value === '' ? '' : parseFloat(e.target.value); recompute(); }}),
        el('span', { class: 'unit' }, 'kW'))),
  ));

  const mount = el('div', { id: 'm8-result', style: { marginTop: '14px' }});
  body.appendChild(mount);

  function recompute() {
    mount.innerHTML = '';
    const qww = state._lastWW?.qwwTag;   // kWh/d
    const vwu = state._lastWW?.vwu;      // l/d
    const qhWP = s.wpQuelleKw !== '' && s.wpQuelleKw > 0
      ? parseFloat(s.wpQuelleKw)
      : (state._lastQh?.qh || state._last?.qhl);

    if (!qww) {
      mount.appendChild(el('div', { style: { color: 'var(--mid-gray)', fontSize: '13px' }},
        'QWW aus M5 erforderlich – Warmwasser zuerst erfassen.'));
      return;
    }

    // §10.1 Grundvolumen
    const volRes = speichervolumen(qww, s.tStoAus, s.tStoEin);
    const vStoCont = volRes.wert;
    // §10.2 mit fsto
    const fstoEntry = FSTO.find(f => f.id === s.fstoId) || FSTO[2];
    const vSto1 = vStoCont * fstoEntry.faktor;
    // §8.2 Speicherverluste aus Volumen
    const verlustKwhTag = speicherverlustAusVolumen(vSto1);
    // §10.3 Spitzendeckung ca. 9-10% VW,u
    const spitzeMin = vwu ? vwu * 0.09 : null;
    const spitzeMax = vwu ? vwu * 0.10 : null;
    // §11.2 WT-Fläche
    const wtEntry = WT_FAUSTFORMEL.find(w => w.id === s.wtId) || WT_FAUSTFORMEL[0];
    const wtFlaeche = qhWP ? qhWP * wtEntry.mPerKw : null;

    // Haupt-Kennzahl
    mount.appendChild(el('div', { class: 'result-card highlight' },
      el('div', {},
        el('div', { class: 'label' }, `Empfohlenes Speichervolumen VW,Sto (×${fstoEntry.faktor})`),
        el('div', { class: 'value' }, `${vSto1.toFixed(0)} l`))));

    mount.appendChild(el('details', { class: 'steps' },
      el('summary', {}, 'Rechenweg'),
      el('div', { class: 'steps-list' },
        el('div', { class: 'step' },
          el('span', { class: 'left' }, 'VW,Sto,cont = QWW / (cp · ΔT / 3600)'),
          el('span', { class: 'right' },
            `${qww.toFixed(2)} / (4.2 · ${s.tStoAus - s.tStoEin} / 3600) = ${vStoCont.toFixed(0)} l`)),
        el('div', { class: 'step' },
          el('span', { class: 'left' }, `× fsto (${fstoEntry.label})`),
          el('span', { class: 'right' }, `× ${fstoEntry.faktor} = ${vSto1.toFixed(0)} l`)),
      )));

    // Spitzendeckung
    if (spitzeMin && spitzeMax) {
      mount.appendChild(el('div', { class: 'result-card', style: { marginTop: '10px' }},
        el('div', {},
          el('div', { class: 'label' }, 'Spitzendeckung Stundenspitze (§10.3, ca. 9–10 % VW,u)'),
          el('div', { class: 'value' }, `${spitzeMin.toFixed(0)} – ${spitzeMax.toFixed(0)} l`))));
    }

    // Speicherverluste aus Volumen
    if (verlustKwhTag != null) {
      mount.appendChild(el('div', { class: 'result-card', style: { marginTop: '10px' }},
        el('div', {},
          el('div', { class: 'label' }, 'Speicherverluste laut Diagramm (§8.2)'),
          el('div', { class: 'value' }, `≈ ${verlustKwhTag.toFixed(2)} kWh/d`))));
    }

    // WT-Fläche
    if (wtFlaeche) {
      mount.appendChild(el('div', { class: 'result-card', style: { marginTop: '10px' }},
        el('div', {},
          el('div', { class: 'label' }, `WT-Fläche Faustformel (§11.2 · ${wtEntry.mPerKw} m²/kW)`),
          el('div', { class: 'value' }, `${wtFlaeche.toFixed(2)} m²`)),
        el('span', { class: 'ampel grau' }, `${qhWP.toFixed(1)} kW`)));
      mount.appendChild(el('details', { class: 'steps' },
        el('summary', {}, 'Rechenweg'),
        el('div', { class: 'steps-list' },
          el('div', { class: 'step' },
            el('span', { class: 'left' }, 'A = QhWP · f'),
            el('span', { class: 'right' }, `${qhWP.toFixed(2)} · ${wtEntry.mPerKw} = ${wtFlaeche.toFixed(2)} m²`)),
        )));
    } else {
      mount.appendChild(el('div', { class: 'hinweis' },
        'Für WT-Fläche: Qh aus M7 nötig oder manuell unter "WP-Heizleistung" eintragen.'));
    }

    // Hinweis-Empfehlungen §10.4
    mount.appendChild(el('div', { class: 'hinweis' },
      'Empfehlungen (§10.4): EFH üblich ~400 l bei 60 °C · MFH 2–3 Ladezyklen/Tag · PV-Eigenoptimierung: Speicher NICHT vergrössern (Hygiene/Effizienz).'));
  }

  body._recompute = recompute;
  setTimeout(recompute, 0);
  return body;
}
