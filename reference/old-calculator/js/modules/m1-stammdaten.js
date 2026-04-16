// Modul M1 – Stammdaten: Gebäudetyp, Lage, EBF, Bauperiode, Wohneinheiten
import { el, bindInputs } from '../ui.js';
import { BAUPERIODEN, VOLLASTSTUNDEN } from '../constants.js';

export function renderM1(state, onChange) {
  const s = state.m1 ||= {
    gebaeudetyp:   'efh',        // 'efh' | 'mfh' | 'buero'
    lage:          'mittelland', // 'mittelland' | 'hoehe'
    wpMachtWW:     false,        // WP erzeugt auch Warmwasser (steuert M5)
    ebf:           '',
    bauperiode:    '1971_80',
    wohneinheiten: 1,
    tvollModus:    'auto',       // 'auto' | 'manuell'
    tvollManuell:  '',           // Override, sonst leer
  };
  // Kompat. Alias: state.m1.inklWW existierte früher → spiegeln auf wpMachtWW
  if (s.inklWW !== undefined && s.wpMachtWW === undefined) s.wpMachtWW = !!s.inklWW;

  const body = el('div', {},
    el('div', { class: 'row row-3' },
      el('label', { class: 'field' },
        el('span', {}, 'Gebäudetyp'),
        el('select', { 'data-key': 'gebaeudetyp' },
          el('option', { value: 'efh' },   'EFH / Eigentumswohnung'),
          el('option', { value: 'mfh' },   'MFH'),
          el('option', { value: 'buero' }, 'Büro / Gewerbe'))),
      el('label', { class: 'field' },
        el('span', {}, 'Lage'),
        el('select', { 'data-key': 'lage' },
          el('option', { value: 'mittelland' }, 'Mittelland'),
          el('option', { value: 'hoehe' },      'ab 800 m ü. M.'))),
      el('label', { class: 'field' },
        el('span', {}, 'WP macht Warmwasser?'),
        el('select', { 'data-key': 'wpMachtWW' },
          el('option', { value: 'false' }, 'nein – separat (Boiler/WP-Boiler)'),
          el('option', { value: 'true' },  'ja – WP übernimmt auch WW'))),
    ),
    el('div', { class: 'row' },
      el('label', { class: 'field' },
        el('span', {}, 'Bauperiode'),
        el('select', { 'data-key': 'bauperiode' },
          ...BAUPERIODEN.map(b => el('option', { value: b.id }, b.label)))),
      el('label', { class: 'field' },
        el('span', {}, 'Energiebezugsfläche EBF',
          el('small', {}, ' – optional, für Plausibilitätskontrolle')),
        el('div', { class: 'input-group' },
          el('input', { type: 'number', 'data-key': 'ebf', step: '1', min: '0', placeholder: 'z. B. 270' }),
          el('span', { class: 'unit' }, 'm²'))),
    ),
    el('div', { class: 'row row-3' },
      el('label', { class: 'field' },
        el('span', {}, 'Anzahl Wohneinheiten'),
        el('input', { type: 'number', 'data-key': 'wohneinheiten', step: '1', min: '1' })),
      el('label', { class: 'field' },
        el('span', {}, 'Vollbetriebsstunden tvoll'),
        el('select', { 'data-key': 'tvollModus' },
          el('option', { value: 'auto' },    'automatisch (FWS §3)'),
          el('option', { value: 'manuell' }, 'manuell überschreiben'))),
      el('label', { class: 'field' },
        el('span', {}, 'tvoll-Wert'),
        el('div', { class: 'input-group' },
          el('input', { id: 'm1-tvoll-out', 'data-key': 'tvollManuell', type: 'number', step: '10', min: '500', placeholder: '2000' }),
          el('span', { class: 'unit' }, 'h/a'))),
    ),
    el('div', { id: 'm1-tvoll-hinweis', class: 'hinweis', style: { marginTop: '8px' }}),
  );

  // Initial-Werte setzen
  setTimeout(() => {
    Object.entries(s).forEach(([k, v]) => {
      const inp = body.querySelector(`[data-key="${k}"]`);
      if (inp) inp.value = typeof v === 'boolean' ? String(v) : v;
    });
    updateTvoll();
  }, 0);

  function autoTvoll() {
    // FWS §3: Basis wohnen_ohneWW – Qw wird separat in M5 gerechnet, nie über tvoll.
    const typ = s.gebaeudetyp === 'buero' ? 'gewerbe_absenkung' : 'wohnen_ohneWW';
    const row = VOLLASTSTUNDEN.find(r => r.gebaeudetyp === typ && r.lage === s.lage);
    return row ? row.tvoll : 2000;
  }

  function updateTvoll() {
    const auto = autoTvoll();
    const input = body.querySelector('#m1-tvoll-out');
    const hinweis = body.querySelector('#m1-tvoll-hinweis');
    if (s.tvollModus === 'manuell' && parseFloat(s.tvollManuell) > 0) {
      s.tvoll = parseFloat(s.tvollManuell);
      if (input) { input.readOnly = false; input.value = s.tvollManuell; }
      if (hinweis) hinweis.textContent = `Manueller Override: tvoll = ${s.tvoll} h/a (automatischer Vorschlag wäre ${auto} h/a).`;
    } else {
      s.tvoll = auto;
      if (input) { input.readOnly = true; input.value = auto; }
      if (hinweis) hinweis.textContent =
        `Automatik: ${s.gebaeudetyp === 'buero' ? 'Büro/Gewerbe (Wochenendabsenkung)' : 'Wohnen ohne WW'}, ${s.lage === 'hoehe' ? '≥ 800 m ü. M.' : 'Mittelland'} → ${auto} h/a. Die WW-Energie wird separat in M5 gerechnet.`;
    }
  }

  bindInputs(body, s, (k, v) => {
    if (k === 'wpMachtWW')     s.wpMachtWW = v === 'true' || v === true;
    if (k === 'inklWW')        s.wpMachtWW = v === 'true' || v === true; // legacy
    if (k === 'ebf')           s.ebf = v === '' ? '' : parseFloat(v);
    if (k === 'wohneinheiten') s.wohneinheiten = parseInt(v) || 1;
    if (k === 'tvollManuell')  s.tvollManuell = v === '' ? '' : parseFloat(v);
    if (k === 'tvollModus')    s.tvollModus = v;
    updateTvoll();
    onChange?.();
  });

  return body;
}
