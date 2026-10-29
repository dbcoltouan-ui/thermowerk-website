/**
 * Material-Picker · Refactor S2 Session 1 (2026-04-27)
 * =====================================================
 * Daten- und Rechen-Modul fuer den gestaffelten Material-Picker im
 * Einfach-Modus (Refactor-Plan-Einfach-Modus-V2 §3 Schritt 2).
 *
 * Aufgabe:
 *   Liefert pro Bauteil (aussenwand/dach/boden/fenster) die UI-Stufen-
 *   Definition (Bauweise → Dicke → Daemmung ja/nein → Daemm-Material →
 *   Daemm-Dicke) und berechnet daraus einen U-Wert.
 *
 * „Unbekannt"-Pattern:
 *   Pro Stufe gibt es eine `null`-Option („— Unbekannt (Pauschalwert)").
 *   Wenn der User Stufe X = unbekannt waehlt, wird NUR diese Stufe mit
 *   dem Default aus `data/uwerte.json` (Baujahrsklasse + Bauteil)
 *   pauschalisiert, alle bekannten Stufen bleiben exakt. Die U-Wert-
 *   Schichtformel kombiniert.
 *
 * Sonderregel Doppelmauerwerk (zweischaliges Mauerwerk):
 *   `hatDaemmung` ist auto-`true` und nicht ueberschreibbar, da
 *   zweischalige Konstruktionen praktisch immer eine Kerndaemmung
 *   zwischen den Schalen haben.
 *
 * Modul ist reiner Rechenkern + Datenmodell (kein DOM, keine UI).
 * Fuer den UI-Aufbau (besichtigung.html-Integration) folgt S2 Session 2.
 *
 * @see docs/REFACTOR-PLAN-EINFACH-MODUS-V2.md §3 Schritt 2
 * @see calc/envelope.mjs — DAEMMSTOFFE, BAUTEIL_DEFAULTS, uWertAusSchichten
 * @see data/uwerte.json — bauteilDefaults, daemmstoffe, fensterGenerationen
 */

import {
  DAEMMSTOFFE,
  BAUTEIL_DEFAULTS,
  bauteilDefaultsFor,
  uWertAusSchichten,
  uValueFallback,
  baujahrklasse,
  FENSTER_GENERATIONEN,
} from './envelope.mjs';

/* ==============================================================
   Fenster-Generations-Default pro Baujahrsklasse.
   Synchron mit data/uwerte.json `fensterGenerationDefault`.
   ============================================================== */
export const FENSTER_GEN_DEFAULT_BY_BK = {
  vor1945: 'einfach',
  '1946_1960': 'einfach',
  '1961_1977': '2fach_unbeschichtet',
  '1978_1994': '2fach_unbeschichtet',
  '1995_2000': '2fach_low_e',
  '2001_2009': '2fach_low_e',
  '2010_2015': '3fach',
  '2016_heute': '3fach',
  minergie: '3fach_passiv',
};

/* ==============================================================
   Bauweisen-Tabelle pro Bauteil.
   --------------------------------------------------------------
   Pro Eintrag:
     key            — interner Schluessel (User-Selektion)
     label          — UI-Text
     lambda         — Material-Lambda (W/mK), null bei Komposit (holzbau, doppelmauerwerk)
     dicken         — Liste typischer Dicken in m (Stufe-2-Optionen)
     defaultDicke   — Pauschalwert wenn Dicke unbekannt
     holzbau        — true bei Holzrahmen-Komposit (Schicht-Stack abweichend)
     doppelmauerwerk — true bei zweischalig (Daemmung auto-on, locked)

   Quelle: calc/envelope.mjs MATERIAL_CATALOG (Lambda-Werte) +
           Praxis-typische Dicken aus Wissensbasis B + Phase-12.5a-
           bauteilDefaults (typische Tragschicht-Staerken pro Baujahr).
   ============================================================== */
export const BAUWEISEN = {
  aussenwand: [
    { key: 'vollziegel',      label: 'Vollziegel / Naturstein (Altbau)',  lambda: 0.81, dicken: [0.30, 0.40, 0.50, 0.60], defaultDicke: 0.50 },
    { key: 'backstein',       label: 'Backstein massiv',                  lambda: 0.81, dicken: [0.24, 0.30, 0.40],       defaultDicke: 0.30 },
    { key: 'hochlochziegel',  label: 'Hochlochziegel',                    lambda: 0.29, dicken: [0.175, 0.24, 0.30, 0.365], defaultDicke: 0.24 },
    { key: 'kalksandstein',   label: 'Kalksandstein',                     lambda: 0.80, dicken: [0.150, 0.175, 0.24],     defaultDicke: 0.175 },
    { key: 'porenbeton',      label: 'Porenbeton',                        lambda: 0.16, dicken: [0.24, 0.30, 0.365],      defaultDicke: 0.30 },
    { key: 'stahlbeton',      label: 'Stahlbeton (Sichtbeton)',           lambda: 1.70, dicken: [0.18, 0.20, 0.25, 0.30], defaultDicke: 0.20 },
    { key: 'holzbau',         label: 'Holzrahmenbau',                     lambda: null, dicken: [0.12, 0.16, 0.20, 0.24], defaultDicke: 0.16, holzbau: true },
    { key: 'doppelmauerwerk', label: 'Doppelmauerwerk (zweischalig)',     lambda: null, dicken: [0.36, 0.40, 0.45],       defaultDicke: 0.40, doppelmauerwerk: true },
  ],
  dach: [
    { key: 'steildach_holz',  label: 'Steildach Holzsparren',  lambda: 0.13, dicken: [0.16, 0.20, 0.24, 0.30], defaultDicke: 0.20 },
    { key: 'flachdach_beton', label: 'Flachdach Stahlbeton',   lambda: 1.70, dicken: [0.18, 0.20, 0.25],       defaultDicke: 0.20 },
    { key: 'pultdach_holz',   label: 'Pultdach Holzsparren',   lambda: 0.13, dicken: [0.16, 0.20, 0.24, 0.30], defaultDicke: 0.20 },
    { key: 'walmdach_holz',   label: 'Walmdach Holzsparren',   lambda: 0.13, dicken: [0.16, 0.20, 0.24, 0.30], defaultDicke: 0.20 },
  ],
  boden: [
    { key: 'stahlbeton',  label: 'Stahlbetonplatte',     lambda: 1.70, dicken: [0.15, 0.18, 0.20, 0.25], defaultDicke: 0.20 },
    { key: 'holzbalken',  label: 'Holzbalkendecke',      lambda: 0.13, dicken: [0.18, 0.22, 0.26],       defaultDicke: 0.22 },
    { key: 'naturstein',  label: 'Naturstein-Gewoelbe', lambda: 2.50, dicken: [0.25, 0.40, 0.60],       defaultDicke: 0.40 },
  ],
};

/* ==============================================================
   Daemm-Dicken-Optionen (m) — Stufe 5.
   Quelle: typische CH-Praxis aus bauteilDefaults
           (4-26 cm in 2-cm-Schritten).
   ============================================================== */
export const DAEMM_DICKEN = [0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.22, 0.24, 0.26];

/* ==============================================================
   Bauteil-Typ-Aliasse + Richtungs-Lookup
   ============================================================== */
const BT_ALIAS = { aw: 'aussenwand' };

const RICHTUNG = {
  aussenwand: 'horizontal',
  dach:       'aufwaerts',
  boden:      'abwaerts',
};

function normBauteilTyp(t) {
  return BT_ALIAS[t] || t;
}

function dickeLabel(d) {
  const cm = d * 100;
  return (Math.abs(cm - Math.round(cm)) < 0.05 ? cm.toFixed(0) : cm.toFixed(1)) + ' cm';
}

function defaultBauweiseFor(bt, bk) {
  if (bt === 'aussenwand') {
    if (bk === 'vor1945')     return 'vollziegel';
    if (bk === '1946_1960')   return 'backstein';
    return 'hochlochziegel';
  }
  if (bt === 'dach')  return 'steildach_holz';
  if (bt === 'boden') return 'stahlbeton';
  return null;
}

/**
 * Baujahr-typisches `hatDaemmung`-Default fuer den Bestand
 * (NICHT Sanierungs-Default). Vor 1978 typisch ungedaemmt,
 * danach mit Daemmung gerechnet.
 */
function defaultHatDaemmungFor(bk) {
  if (bk === 'vor1945' || bk === '1946_1960' || bk === '1961_1977') return false;
  return true;
}

/**
 * Liefert die UI-Stufen-Definition fuer ein Bauteil.
 * Aufruf vom UI: rendere pro Stufe ein <select> mit options[],
 * speichere User-Wahl in partialState und rufe `computeUWert`.
 *
 * @param {('aw'|'aussenwand'|'dach'|'boden'|'fenster')} bauteilTyp
 * @param {number|string} baujahr
 * @param {object} [partialState] — User-Selektionen (sel.bauweise etc.)
 * @returns {{
 *   bauteilTyp: string,
 *   baujahrklasse: string,
 *   fenster: boolean,
 *   isDoppelmauerwerk?: boolean,
 *   stufen: Array<{key,label,options,defaultIfUnknown,source,locked?:boolean}>
 * }}
 */
export function getStufen(bauteilTyp, baujahr, partialState) {
  const bt = normBauteilTyp(bauteilTyp);
  const bk = baujahrklasse(baujahr) || '1978_1994';
  const sel = partialState || {};

  /* ---- Fenster: nur EINE Stufe (Generation) ---- */
  if (bt === 'fenster') {
    const genOptions = Object.keys(FENSTER_GENERATIONEN)
      .filter(k => k !== 'unbekannt')
      .map(k => ({
        value: k,
        label: FENSTER_GENERATIONEN[k].label + ' (Uw=' + FENSTER_GENERATIONEN[k].uw.toFixed(2) + ')',
      }));
    genOptions.push({ value: null, label: '— Unbekannt (Pauschalwert)' });
    return {
      bauteilTyp: bt,
      baujahrklasse: bk,
      fenster: true,
      stufen: [
        {
          key: 'generation',
          label: 'Fenster-Generation',
          options: genOptions,
          defaultIfUnknown: FENSTER_GEN_DEFAULT_BY_BK[bk] || '2fach_unbeschichtet',
          source: 'fensterGenerationDefault[' + bk + ']',
        },
      ],
    };
  }

  /* ---- AW / Dach / Boden: 5 Stufen ---- */
  const bws = BAUWEISEN[bt] || [];
  const defaults = bauteilDefaultsFor(bt, bk) || null;
  const isDoppel = sel.bauweise === 'doppelmauerwerk';

  // Stufe 1 — Bauweise
  const bauweiseOptions = bws.map(b => ({ value: b.key, label: b.label, lambda: b.lambda }));
  bauweiseOptions.push({ value: null, label: '— Unbekannt (Pauschalwert)' });
  const defaultBwKey = defaultBauweiseFor(bt, bk) || (bws[0] && bws[0].key) || null;

  const activeBwKey = sel.bauweise || defaultBwKey;
  const activeBw = bws.find(b => b.key === activeBwKey) || bws[0];

  // Stufe 2 — Dicke
  const dickenOptions = (activeBw ? activeBw.dicken : []).map(d => ({ value: d, label: dickeLabel(d) }));
  dickenOptions.push({ value: null, label: '— Unbekannt (Pauschalwert)' });

  // Stufe 3 — Daemmung ja/nein (Doppelmauerwerk: locked-true)
  const daemmungOptions = isDoppel
    ? [{ value: true, label: 'Ja (Kerndaemmung — fix bei Doppelmauerwerk)' }]
    : [
        { value: true,  label: 'Ja' },
        { value: false, label: 'Nein' },
        { value: null,  label: '— Unbekannt (Pauschalwert)' },
      ];

  // Stufe 4 — Daemm-Material
  const daemmstoffOptions = Object.keys(DAEMMSTOFFE)
    .filter(k => k !== 'unbekannt')
    .map(k => ({ value: k, label: DAEMMSTOFFE[k].label + ' (λ=' + DAEMMSTOFFE[k].lambda.toFixed(3) + ')' }));
  daemmstoffOptions.push({ value: null, label: '— Unbekannt (Pauschalwert)' });

  // Stufe 5 — Daemm-Dicke
  const daemmDickenOptions = DAEMM_DICKEN.map(d => ({ value: d, label: dickeLabel(d) }));
  daemmDickenOptions.push({ value: null, label: '— Unbekannt (Pauschalwert)' });

  return {
    bauteilTyp: bt,
    baujahrklasse: bk,
    fenster: false,
    isDoppelmauerwerk: isDoppel,
    stufen: [
      {
        key: 'bauweise',
        label: 'Bauweise',
        options: bauweiseOptions,
        defaultIfUnknown: defaultBwKey,
        source: 'BAUWEISEN[' + bt + '] + bauteilDefaults[' + bk + ']',
      },
      {
        key: 'dicke',
        label: 'Dicke der Tragschicht',
        options: dickenOptions,
        defaultIfUnknown: activeBw ? activeBw.defaultDicke : null,
        source: 'BAUWEISEN[' + bt + '][' + (activeBw ? activeBw.key : '?') + '].defaultDicke',
      },
      {
        key: 'hatDaemmung',
        label: 'Ist gedaemmt?',
        options: daemmungOptions,
        defaultIfUnknown: isDoppel ? true : defaultHatDaemmungFor(bk),
        source: 'baujahrklasse-Default (vor 1978 = nein, ab 1978 = ja)',
        locked: isDoppel,
      },
      {
        key: 'daemmstoff',
        label: 'Daemm-Material',
        options: daemmstoffOptions,
        defaultIfUnknown: defaults && defaults.daemmung ? defaults.daemmung.material : 'mineralwolle',
        source: 'bauteilDefaults[' + bk + '].daemmung.material',
      },
      {
        key: 'daemmDicke',
        label: 'Daemm-Dicke',
        options: daemmDickenOptions,
        defaultIfUnknown: defaults && defaults.daemmung ? defaults.daemmung.dicke : 0.06,
        source: 'bauteilDefaults[' + bk + '].daemmung.dicke',
      },
    ],
  };
}

/**
 * Berechnet den U-Wert + Quelle aus den User-Selektionen.
 * Stufen mit `null` werden mit dem Baujahrs-/Bauteil-Default
 * pauschalisiert; bekannte Stufen bleiben exakt.
 *
 * @param {('aw'|'aussenwand'|'dach'|'boden'|'fenster')} bauteilTyp
 * @param {number|string} baujahr
 * @param {object} selections
 *   AW/Dach/Boden: {bauweise, dicke, hatDaemmung, daemmstoff, daemmDicke}
 *   Fenster:       {generation}
 * @returns {{
 *   uWert: number|null,
 *   quelle: 'voll-bekannt'|'gemischt'|'voll-unbekannt',
 *   schichten: Array,
 *   defaultsAngewendet: object,
 *   unbekanntStufen: string[],
 *   marker: string
 * }}
 */
export function computeUWert(bauteilTyp, baujahr, selections) {
  const bt = normBauteilTyp(bauteilTyp);
  const bk = baujahrklasse(baujahr) || '1978_1994';
  const sel = selections || {};

  /* ---- Fenster: 1 Stufe ---- */
  if (bt === 'fenster') {
    const wasUnknown = (sel.generation == null);
    const gen = wasUnknown
      ? (FENSTER_GEN_DEFAULT_BY_BK[bk] || '2fach_unbeschichtet')
      : sel.generation;
    const def = FENSTER_GENERATIONEN[gen] || FENSTER_GENERATIONEN['2fach_unbeschichtet'];
    return {
      uWert: def.uw,
      quelle: wasUnknown ? 'voll-unbekannt' : 'voll-bekannt',
      schichten: [],
      defaultsAngewendet: { generation: gen },
      unbekanntStufen: wasUnknown ? ['generation'] : [],
      marker: wasUnknown ? 'baujahr' : 'gemessen',
    };
  }

  /* ---- AW / Dach / Boden ---- */
  const bws = BAUWEISEN[bt] || [];
  const defaults = bauteilDefaultsFor(bt, bk) || null;
  const unbekanntStufen = [];
  const angewendet = {};

  // Pre-Check: voll-unbekannt → direkter Baujahr-Lookup statt Schicht-Rekonstruktion
  // (sonst liefert der Sanierungs-Default in bauteilDefaults einen zu niedrigen
  // U-Wert fuer Altbauten, vgl. Refactor-Plan-Einfach-Modus-V2 §3 Schritt 2).
  const allNull = (sel.bauweise == null) && (sel.dicke == null) && (sel.hatDaemmung == null) && (sel.daemmstoff == null) && (sel.daemmDicke == null);
  if (allNull) {
    const bauteilTypForFallback = bt === 'aussenwand' ? 'aussenwand'
      : bt === 'dach' ? 'dach'
      : bt === 'boden' ? 'bodenPlatte' : null;
    const dachform = bt === 'dach' ? 'steildach' : undefined;
    const fb = uValueFallback({
      bauteilTyp: bauteilTypForFallback,
      baujahr,
      gebaeudetyp: 'EFH',
      dachform,
    });
    return {
      uWert: fb.u,
      quelle: 'voll-unbekannt',
      schichten: [],
      defaultsAngewendet: { quelle: 'baujahr-typ-uwert', baujahrklasse: bk },
      unbekanntStufen: ['bauweise', 'dicke', 'hatDaemmung', 'daemmstoff', 'daemmDicke'],
      marker: 'baujahr',
    };
  }

  // 1. bauweise
  let bwKey = sel.bauweise;
  if (bwKey == null) {
    unbekanntStufen.push('bauweise');
    bwKey = defaultBauweiseFor(bt, bk) || (bws[0] && bws[0].key);
  }
  angewendet.bauweise = bwKey;
  const bwDef = bws.find(b => b.key === bwKey) || bws[0];
  const isDoppel = bwKey === 'doppelmauerwerk';

  // 2. dicke
  let dicke = sel.dicke;
  if (dicke == null) {
    unbekanntStufen.push('dicke');
    dicke = bwDef ? bwDef.defaultDicke : null;
  }
  angewendet.dicke = dicke;

  // 3. hatDaemmung — bei Doppelmauerwerk locked auf true
  let hatDaemmung;
  if (isDoppel) {
    hatDaemmung = true;
  } else if (sel.hatDaemmung == null) {
    unbekanntStufen.push('hatDaemmung');
    hatDaemmung = defaultHatDaemmungFor(bk);
  } else {
    hatDaemmung = sel.hatDaemmung;
  }
  angewendet.hatDaemmung = hatDaemmung;

  // 4 + 5. daemmstoff + daemmDicke (nur wenn hatDaemmung)
  let daemmstoff = null;
  let daemmDicke = 0;
  if (hatDaemmung) {
    daemmstoff = sel.daemmstoff;
    if (daemmstoff == null) {
      unbekanntStufen.push('daemmstoff');
      daemmstoff = (defaults && defaults.daemmung) ? defaults.daemmung.material : 'mineralwolle';
    }
    angewendet.daemmstoff = daemmstoff;

    daemmDicke = sel.daemmDicke;
    if (daemmDicke == null) {
      unbekanntStufen.push('daemmDicke');
      daemmDicke = (defaults && defaults.daemmung) ? defaults.daemmung.dicke : 0.06;
    }
    angewendet.daemmDicke = daemmDicke;
  }

  // Schichten zusammenbauen
  const schichten = [];
  if (bwDef && bwDef.holzbau) {
    // Holzrahmen-Komposit: Beplankung + Staender (mit/ohne Daemmung) + Aussenschalung
    schichten.push({ label: 'Innenbeplankung Gipskarton', lambda: 0.21, d: 0.0125 });
    if (hatDaemmung && daemmDicke > 0) {
      schichten.push({ material: daemmstoff, d: daemmDicke });
    } else {
      // Ohne Daemmung: Hohlraum-Mittelwert (ungewoehnliche Wahl, aber nicht blockieren)
      schichten.push({ label: 'Holzrahmen Hohlraum', lambda: 0.13, d: dicke });
    }
    schichten.push({ label: 'Aussenschalung Holz', lambda: 0.13, d: 0.022 });
  } else if (isDoppel) {
    // Zweischalig: Innenputz + Innenschale 17,5 cm + Kerndaemmung + Klinker-Vormauer 11,5 cm
    schichten.push({ label: 'Innenputz Kalkgips', lambda: 0.70, d: 0.015 });
    schichten.push({ label: 'Innenschale Mauerwerk', lambda: 0.81, d: 0.175 });
    schichten.push({ material: daemmstoff, d: daemmDicke });
    schichten.push({ label: 'Aussenschalung Holz', lambda: 0.13, d: 0.022 });
  } else if (isDoppel) {
    // Zweischalig: Innenputz + Innenschale 17,5 cm + Kerndaemmung + Klinker-Vormauer 11,5 cm
    schichten.push({ label: 'Innenputz Kalkgips', lambda: 0.70, d: 0.015 });
    schichten.push({ label: 'Innenschale Mauerwerk', lambda: 0.81, d: 0.175 });
    schichten.push({ material: daemmstoff, d: daemmDicke });
    schichten.push({ label: 'Aussenschale Klinker', lambda: 0.81, d: 0.115 });
  } else {
    // Massiv (Vollziegel/Backstein/HLZ/KSE/Porenbeton/Stahlbeton/Steildach/Flachdach/Boden)
    if (defaults && defaults.putzInnen) schichten.push({ ...defaults.putzInnen });
    if (bwDef) schichten.push({ label: bwDef.label, lambda: bwDef.lambda, d: dicke });
    if (hatDaemmung && daemmDicke > 0) schichten.push({ material: daemmstoff, d: daemmDicke });
    if (defaults && defaults.putzAussen) schichten.push({ ...defaults.putzAussen });
  }

  // U-Wert via Schichtformel
  const dir = RICHTUNG[bt] || 'horizontal';
  const r = uWertAusSchichten(schichten, { direction: dir, markerSource: 'material' });

  // Quelle klassifizieren
  const relevantCount = 2 + (isDoppel ? 0 : 1) + (hatDaemmung ? 2 : 0);
  let quelle;
  if (unbekanntStufen.length === 0) quelle = 'voll-bekannt';
  else if (unbekanntStufen.length >= relevantCount) quelle = 'voll-unbekannt';
  else quelle = 'gemischt';

  // Marker passend zur Quelle
  const marker = quelle === 'voll-bekannt' ? 'gemessen'
                : quelle === 'voll-unbekannt' ? 'baujahr'
                : 'gemischt';

  return {
    uWert: r.U,
    quelle,
    schichten: r.schichten,
    defaultsAngewendet: angewendet,
    unbekanntStufen,
    marker,
  };
}

export default {
  BAUWEISEN,
  DAEMM_DICKEN,
  FENSTER_GEN_DEFAULT_BY_BK,
  getStufen,
  computeUWert,
};
