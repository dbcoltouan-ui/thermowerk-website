// src/calc/offerte.mjs
//
// Offerten-Modul – Schema-Validierung + Paket-Auflösung.
// Reine Funktionen ohne DOM-Bindungen.
//
// @see OFFERTEN-GAMEPLAN.md (Session 1 – Datenmodell)
// @see OFFERTEN-RESEARCH.md §7 (Standardpositionen A–K)
// @see SYNTHESE.md §4 (Stolperstein-Positionen Kategorie L)

const ERLAUBTE_KATEGORIEN = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const ERLAUBTE_EINHEITEN = ['Stk','m','h','Pauschal','Jahr','%'];
const ERLAUBTE_KRITISCH_CHECKS = [
  'hak','asbest','hydraulik','fbh-verteiler',
  'cooling','schall-lokal','geak-pflicht',
];

const POSITION_PFLICHT = ['id','kategorie','name','einheit','einheits_preis','default_menge'];

/**
 * Validiert eine einzelne Position.
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validatePosition(p) {
  const errors = [];
  if (!p || typeof p !== 'object') {
    return { ok: false, errors: ['Position ist kein Objekt'] };
  }
  for (const f of POSITION_PFLICHT) {
    if (p[f] === undefined || p[f] === null) errors.push(`Pflichtfeld fehlt: ${f}`);
  }
  if (p.kategorie && !ERLAUBTE_KATEGORIEN.includes(p.kategorie)) {
    errors.push(`Ungültige Kategorie '${p.kategorie}' (erlaubt: ${ERLAUBTE_KATEGORIEN.join(',')})`);
  }
  if (p.einheit && !ERLAUBTE_EINHEITEN.includes(p.einheit)) {
    errors.push(`Ungültige Einheit '${p.einheit}' (erlaubt: ${ERLAUBTE_EINHEITEN.join(',')})`);
  }
  if (typeof p.einheits_preis !== 'number' || !Number.isFinite(p.einheits_preis) || p.einheits_preis < 0) {
    errors.push(`einheits_preis muss endliche Zahl ≥ 0 sein (war ${p.einheits_preis})`);
  }
  if (typeof p.default_menge !== 'number' || p.default_menge < 0) {
    errors.push(`default_menge muss Zahl ≥ 0 sein (war ${p.default_menge})`);
  }
  if (p.kritisch_check != null && !ERLAUBTE_KRITISCH_CHECKS.includes(p.kritisch_check)) {
    errors.push(`Unbekannter kritisch_check '${p.kritisch_check}' (erlaubt: null oder ${ERLAUBTE_KRITISCH_CHECKS.join(',')})`);
  }
  if (p.einheit === 'h' && (p.stundensatz == null || typeof p.stundensatz !== 'number')) {
    errors.push('Einheit "h" benötigt numerischen stundensatz');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Validiert die Positionen-Stammdaten (Array).
 * @param {Array} positionen
 * @returns {{ok: boolean, errors: string[], duplicate_ids: string[]}}
 */
export function validatePositionen(positionen) {
  const errors = [];
  if (!Array.isArray(positionen)) {
    return { ok: false, errors: ['positionen ist kein Array'], duplicate_ids: [] };
  }
  const ids = new Map();  // id -> count
  positionen.forEach((p, i) => {
    const r = validatePosition(p);
    if (!r.ok) errors.push(`#${i} (${p?.id ?? '???'}): ${r.errors.join('; ')}`);
    if (p?.id) ids.set(p.id, (ids.get(p.id) || 0) + 1);
  });
  const duplicate_ids = [...ids.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  duplicate_ids.forEach(id => errors.push(`Doppelte ID: ${id}`));
  return { ok: errors.length === 0, errors, duplicate_ids };
}

/**
 * Validiert ein Paket gegen die Positionen-Stammdaten.
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validatePaket(paket, positionen) {
  const errors = [];
  if (!paket || typeof paket !== 'object') return { ok: false, errors: ['Paket ist kein Objekt'] };
  if (!paket.id) errors.push('Paket-Pflichtfeld fehlt: id');
  if (!paket.name) errors.push('Paket-Pflichtfeld fehlt: name');
  if (!Array.isArray(paket.positionen)) {
    errors.push('Paket-Pflichtfeld fehlt: positionen[]');
    return { ok: false, errors };
  }
  const idMap = new Map(positionen.map(p => [p.id, p]));
  paket.positionen.forEach((entry, i) => {
    if (!entry?.position_id) errors.push(`Position #${i}: position_id fehlt`);
    else if (!idMap.has(entry.position_id))
      errors.push(`Position #${i}: unbekannte position_id '${entry.position_id}'`);
    if (entry?.menge_override != null && (typeof entry.menge_override !== 'number' || entry.menge_override < 0))
      errors.push(`Position #${i} (${entry.position_id}): menge_override muss Zahl ≥ 0 sein`);
  });
  return { ok: errors.length === 0, errors };
}

/**
 * Löst ein Paket auf — fügt aus den Stammdaten die Position-Daten ein
 * und wendet menge_override an.
 *
 * @param {object} paket  – Paket aus offerten-pakete.json
 * @param {Array}  positionen – Stammdaten aus offerten-positionen.json
 * @returns {Array<object>}  – Paket-Positionen mit `menge`, `subtotal`,
 *                              `position` (vollständige Stammdaten-Position)
 */
export function resolvePaket(paket, positionen) {
  const idMap = new Map(positionen.map(p => [p.id, p]));
  const resolved = [];
  for (const entry of paket.positionen ?? []) {
    const stamm = idMap.get(entry.position_id);
    if (!stamm) continue;  // skipped unknown ids – Validierung sollte vorher laufen
    const menge = entry.menge_override ?? stamm.default_menge ?? 0;
    const stueck_preis = stamm.einheits_preis ?? 0;
    const subtotal = stamm.einheit === '%'
      ? 0  // Prozent-Positionen werden im Tool spät auf Bausumme angewendet
      : menge * stueck_preis;
    resolved.push({
      position_id: stamm.id,
      kategorie: stamm.kategorie,
      kategorie_name: stamm.kategorie_name,
      name: stamm.name,
      einheit: stamm.einheit,
      einheits_preis: stueck_preis,
      menge,
      subtotal,
      bemerkung: stamm.bemerkung ?? '',
      kritisch_check: stamm.kritisch_check ?? null,
      ist_pauschal: !!stamm.ist_pauschal,
      stundensatz: stamm.stundensatz ?? null,
      npk_code: stamm.npk_code ?? null,
      hersteller_garantie_jahre: stamm.hersteller_garantie_jahre ?? null,
      _stamm: stamm,
    });
  }
  return resolved;
}

/**
 * Berechnet das Subtotal eines aufgelösten Pakets/einer Positionsliste.
 * Prozent-Positionen (z. B. „Bauleitung 6 %") werden auf das Subtotal
 * der nicht-prozentigen Positionen angewendet und sind im Total enthalten.
 */
export function computePaketSubtotal(resolvedPositionen) {
  const fix = resolvedPositionen.filter(p => p.einheit !== '%');
  const proz = resolvedPositionen.filter(p => p.einheit === '%');
  const fix_sum = fix.reduce((s, p) => s + (p.subtotal || 0), 0);
  const proz_sum = proz.reduce((s, p) => s + (fix_sum * (p.einheits_preis / 100) * (p.menge || 1)), 0);
  return {
    fix_sum,
    proz_sum,
    netto_subtotal: fix_sum + proz_sum,
  };
}

/**
 * Wendet MwSt + Förderung-Abzug an.
 * @param {number} netto_subtotal
 * @param {object} opt – { mwst_pct=8.1, foerderung_chf=0 }
 */
export function applyTaxAndFoerderung(netto_subtotal, { mwst_pct = 8.1, foerderung_chf = 0 } = {}) {
  const mwst_chf = Math.round((netto_subtotal * mwst_pct / 100) * 100) / 100;
  const brutto = netto_subtotal + mwst_chf;
  const netto_invest = brutto - foerderung_chf;
  return {
    netto_subtotal,
    mwst_pct,
    mwst_chf,
    brutto,
    foerderung_chf,
    netto_invest,
  };
}

export const _internal = {
  ERLAUBTE_KATEGORIEN,
  ERLAUBTE_EINHEITEN,
  ERLAUBTE_KRITISCH_CHECKS,
};

/* ==========================================================================
   SESSION 2 — Auto-Vorbelegung aus Heizlast-Auslegung
   ==========================================================================
   buildVorbelegung(state, calc, opts) baut die initiale Offerten-Positionsliste
   basierend auf dem aktuellen Auslegungs-State + compute()-Resultat:
     - state.projekt.wp_quelle  -> Paket-Vorschlag (luft -> LW-Paket, sole -> SW-Paket)
     - calc.heatpump.sel        -> Stuekpreis + Modell-Name auf wp-lw-... / wp-sw-... ueberschreiben
     - calc.heatpump.sel.reversibel === true -> Cooling-Position automatisch aktivieren
     - calc.VW_Sto              -> WW-Speichervolumen 200/300/400 l auswaehlen
     - calc.VP_Sto              -> Pufferspeicher 200/500/1000 l auswaehlen
     - state.detail.verteilung.heizkreise -> fbh-stellantriebe Menge anpassen
   Liefert { paket_id, positionen[] } mit Positionen in der gleichen Form, die
   resolvePaket() liefert - so kann die UI beide Quellen einheitlich rendern.
   ========================================================================== */

const _PAKET_PER_QUELLE = {
  luft:   'paket-lw-aussen-oel-ersatz',
  sole:   'paket-sw-erdsonde-150m',
  wasser: 'paket-sw-erdsonde-150m'   // Naechste sinnvolle Vorlage; Daniel kann wechseln
};

function _wpStammIdForQuelle(quelle){
  if (quelle === 'sole')  return 'wp-sw-8-14kw';
  if (quelle === 'wasser') return 'wp-sw-8-14kw';
  return 'wp-lw-8-14kw';
}

function _wpModelLabel(sel){
  if (!sel || typeof sel !== 'object') return null;
  const teile = [sel.Marke, sel.Serie, sel.Modell].filter(Boolean);
  return teile.length ? teile.join(' ') : null;
}

function _pickSpeicherId(V){
  // ww-speicher-emailliert-200l/300l/400l (Stammdaten Kategorie C)
  const v = Number(V) || 0;
  if (v <= 250) return 'ww-speicher-emailliert-200l';
  if (v <= 350) return 'ww-speicher-emailliert-300l';
  return 'ww-speicher-emailliert-400l';
}

function _pickPufferId(V){
  const v = Number(V) || 0;
  if (v <= 350)  return 'pufferspeicher-200l';
  if (v <= 750)  return 'pufferspeicher-500l';
  return 'pufferspeicher-1000l';
}

/**
 * Baut die initiale Offerten-Positionsliste.
 * @param {object} state vollstaendiger State (aus state.mjs)
 * @param {object} calc  compute()-Resultat (mit calc.heatpump.sel, calc.VW_Sto, calc.VP_Sto)
 * @param {object} opts  { positionen, pakete } - Stammdaten
 * @returns {{paket_id: string|null, positionen: Array}}
 */
export function buildVorbelegung(state, calc, opts){
  const stamm = (opts && Array.isArray(opts.positionen)) ? opts.positionen : [];
  const pakete = (opts && Array.isArray(opts.pakete)) ? opts.pakete : [];
  if (!stamm.length || !pakete.length){
    return { paket_id: null, positionen: [] };
  }
  const quelle = (state && state.projekt && state.projekt.wp_quelle) || 'luft';
  const paket_id = _PAKET_PER_QUELLE[quelle] || _PAKET_PER_QUELLE.luft;
  const paket = pakete.find(p => p.id === paket_id);
  if (!paket){
    return { paket_id: null, positionen: [] };
  }

  // 1) Paket aufloesen
  const resolved = resolvePaket(paket, stamm);

  // 2) WP-Modell-Override: ersetze Stueckpreis + Bemerkung der WP-Position aus calc.heatpump.sel
  const sel = calc && calc.heatpump && calc.heatpump.sel ? calc.heatpump.sel : null;
  const wpStammId = _wpStammIdForQuelle(quelle);
  if (sel){
    const idx = resolved.findIndex(p => p.position_id === wpStammId);
    if (idx >= 0){
      const label = _wpModelLabel(sel);
      const preisNeu = Number(sel.preis_chf || sel.listenpreis_chf) || resolved[idx].einheits_preis;
      resolved[idx].einheits_preis = preisNeu;
      resolved[idx].subtotal = (resolved[idx].menge || 1) * preisNeu;
      if (label){
        resolved[idx].bemerkung = (resolved[idx].bemerkung
          ? resolved[idx].bemerkung + ' · '
          : '') + 'Modell: ' + label;
        resolved[idx].name = resolved[idx].name + ' (' + label + ')';
      }
    }
  }

  // 3) Speichervolumen anpassen anhand calc.VW_Sto
  if (calc && calc.VW_Sto > 0){
    const wantId = _pickSpeicherId(calc.VW_Sto);
    const idx = resolved.findIndex(p => /ww-speicher-emailliert-\d+l/.test(p.position_id));
    if (idx >= 0 && resolved[idx].position_id !== wantId){
      const ersatz = stamm.find(s => s.id === wantId);
      if (ersatz){
        resolved[idx] = {
          position_id: ersatz.id,
          kategorie: ersatz.kategorie,
          kategorie_name: ersatz.kategorie_name,
          name: ersatz.name,
          einheit: ersatz.einheit,
          einheits_preis: ersatz.einheits_preis,
          menge: 1,
          subtotal: ersatz.einheits_preis,
          bemerkung: ersatz.bemerkung || '',
          kritisch_check: ersatz.kritisch_check || null,
          ist_pauschal: !!ersatz.ist_pauschal,
          stundensatz: ersatz.stundensatz || null,
          npk_code: ersatz.npk_code || null,
          hersteller_garantie_jahre: ersatz.hersteller_garantie_jahre || null,
          _stamm: ersatz
        };
      }
    }
  }

  // 4) Pufferspeicher anpassen anhand calc.VP_Sto (nur wenn schon ein Puffer im Paket ist)
  if (calc && calc.VP_Sto > 0){
    const wantId = _pickPufferId(calc.VP_Sto);
    const idx = resolved.findIndex(p => /pufferspeicher-\d+l/.test(p.position_id));
    if (idx >= 0 && resolved[idx].position_id !== wantId){
      const ersatz = stamm.find(s => s.id === wantId);
      if (ersatz){
        resolved[idx] = {
          position_id: ersatz.id,
          kategorie: ersatz.kategorie,
          kategorie_name: ersatz.kategorie_name,
          name: ersatz.name,
          einheit: ersatz.einheit,
          einheits_preis: ersatz.einheits_preis,
          menge: 1,
          subtotal: ersatz.einheits_preis,
          bemerkung: ersatz.bemerkung || '',
          kritisch_check: ersatz.kritisch_check || null,
          ist_pauschal: !!ersatz.ist_pauschal,
          stundensatz: ersatz.stundensatz || null,
          npk_code: ersatz.npk_code || null,
          hersteller_garantie_jahre: ersatz.hersteller_garantie_jahre || null,
          _stamm: ersatz
        };
      }
    }
  }

  // 5) Stellantriebe-Menge aus Anzahl Heizkreise (nur wenn fbh-stellantriebe existiert
  //    oder per Detail-Mode FBH gewaehlt - hier additiv hinzufuegen, wenn nicht im Paket)
  const heizkreise = (state && state.detail && state.detail.verteilung
                      && Array.isArray(state.detail.verteilung.heizkreise))
                       ? state.detail.verteilung.heizkreise.length : 1;
  if (heizkreise > 0){
    const idxStell = resolved.findIndex(p => p.position_id === 'fbh-stellantriebe');
    if (idxStell >= 0){
      resolved[idxStell].menge = heizkreise;
      resolved[idxStell].subtotal = heizkreise * resolved[idxStell].einheits_preis;
    }
  }

  // 6) Cooling-Aufpreis automatisch hinzufuegen, wenn WP reversibel
  if (sel && sel.reversibel === true){
    const already = resolved.find(p => p.position_id === 'cooling-aufpreis-reversibel');
    if (!already){
      const cool = stamm.find(s => s.id === 'cooling-aufpreis-reversibel');
      if (cool){
        resolved.push({
          position_id: cool.id,
          kategorie: cool.kategorie,
          kategorie_name: cool.kategorie_name,
          name: cool.name,
          einheit: cool.einheit,
          einheits_preis: cool.einheits_preis,
          menge: cool.default_menge || 1,
          subtotal: (cool.default_menge || 1) * cool.einheits_preis,
          bemerkung: 'Auto: WP ist reversibel.',
          kritisch_check: cool.kritisch_check || null,
          ist_pauschal: !!cool.ist_pauschal,
          stundensatz: cool.stundensatz || null,
          npk_code: cool.npk_code || null,
          hersteller_garantie_jahre: cool.hersteller_garantie_jahre || null,
          _stamm: cool
        });
      }
    }
  }

  // 7) UI-State-Form: jede Position bekommt eine eindeutige Instanz-`id`,
  //    damit der State sie im positionen[]-Array referenzieren kann.
  const positionen = resolved.map((p, i) => Object.assign({}, p, {
    id: p.position_id + '__' + i,
    _isCustom: false
  }));

  return { paket_id, positionen };
}

/**
 * Pre-Sales-Check -> Stammdaten-ID-Map (Kategorie L Stolperstein-Positionen).
 * Liefert Mapping check_key -> position_id, damit das Pre-Sales-Modal
 * angekreuzte Posten direkt in die Offerte heben kann.
 */
export const PRE_SALES_TO_POSITION_ID = {
  hak:           'hak-upgrade-25-40-63a',
  asbest:        'asbest-schnelltest-sanierung',
  hydraulik:     'rohrnetz-anpassung-hydraulik',
  fbhVerteiler:  'fbh-verteiler-sanierung-stockwerk',
  cooling:       'cooling-aufpreis-reversibel',
  schallLokal:   'schallschutz-erweitert-innensplit',
  geakPflicht:   'geak-pflicht-fr-vd-ne-ju'
};

/**
 * Hebt Pre-Sales-Checks in Offerten-Positionen.
 * @param {Array} positionen - aktuelle state.offerte.positionen
 * @param {object} checks    - state.offerte.pre_sales_checks
 * @param {Array} stamm      - Stammdaten-Positionen
 * @returns {Array} neue positionen[] (alte werden behalten, neue addiert)
 */
export function applyPreSalesChecks(positionen, checks, stamm){
  if (!Array.isArray(positionen)) positionen = [];
  if (!checks || typeof checks !== 'object') return positionen.slice();
  if (!Array.isArray(stamm)) stamm = [];
  const out = positionen.slice();
  Object.keys(PRE_SALES_TO_POSITION_ID).forEach(key => {
    if (!checks[key]) return;
    const posId = PRE_SALES_TO_POSITION_ID[key];
    const already = out.find(p => p.position_id === posId);
    if (already) return;
    const s = stamm.find(x => x.id === posId);
    if (!s) return;
    out.push({
      id: posId + '__check_' + key,
      position_id: s.id,
      kategorie: s.kategorie,
      kategorie_name: s.kategorie_name,
      name: s.name,
      einheit: s.einheit,
      einheits_preis: s.einheits_preis,
      menge: s.default_menge || 1,
      subtotal: (s.default_menge || 1) * s.einheits_preis,
      bemerkung: 'Auto aus Pre-Sales-Checkliste.',
      kritisch_check: s.kritisch_check || null,
      ist_pauschal: !!s.ist_pauschal,
      stundensatz: s.stundensatz || null,
      npk_code: s.npk_code || null,
      hersteller_garantie_jahre: s.hersteller_garantie_jahre || null,
      _isCustom: false,
      _stamm: s
    });
  });
  return out;
}
