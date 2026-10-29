// src/calc/envelope.mjs
// Hüllflächen + U-Wert-Lookup nach Baujahr & Gebäudetyp.
// Quelle: data/u-werte.json (Perplexity-Recherche CH 2026-04-22),
// Wissensbasis B (DIN EN ISO 6946 für Schichtaufbau).
//
// Pure Funktionen — Daten werden injiziert (kein FS-Zugriff, kein Import).

/* ==========================================================================
   BAUKLASSEN-MAPPING (für u-werte.json-Keys)
   ========================================================================== */

/** Mappt eine Baujahr (Number) auf die u-werte.json-Bauklasse.
 *  Bauklassen in u-werte.json: 'vor1945', '1946_1960', '1961_1977',
 *  '1978_1994', '1995_2000', '2001_2009', '2010_2015', '2016_heute', 'minergie'. */
export function bauklasseFromBaujahr(baujahr){
  const y = Number(baujahr);
  if (!Number.isFinite(y) || y <= 0) return null;
  if (y < 1946) return 'vor1945';
  if (y <= 1960) return '1946_1960';
  if (y <= 1977) return '1961_1977';
  if (y <= 1994) return '1978_1994';
  if (y <= 2000) return '1995_2000';
  if (y <= 2009) return '2001_2009';
  if (y <= 2015) return '2010_2015';
  return '2016_heute';
}

/** Mappt einen FWS-Bauperiode-Key (z.B. '1971-1980') auf die u-werte.json-Bauklasse.
 *  Bei Spannweiten wird der Mittelwert genommen (so trifft '1971-1980' den
 *  Bauklassen-Schwerpunkt '1961_1977', '1986-1990' den '1978_1994' usw.). */
export function bauklasseFromPeriode(periode){
  if (!periode || typeof periode !== 'string') return null;
  if (periode === 'minergie') return 'minergie';
  if (periode === '<1919') return 'vor1945';
  if (periode === '2011-heute') return '2016_heute';
  const m = periode.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (m) return bauklasseFromBaujahr(Math.round((Number(m[1]) + Number(m[2])) / 2));
  const m2 = periode.match(/(\d{4})/);
  if (m2) return bauklasseFromBaujahr(Number(m2[1]));
  return null;
}

/** Sanierungsstand → Bauklassen-Override.
 *  'unsaniert' = original; 'teilsaniert' = ein Schritt jünger;
 *  'saniert' = '2010_2015'; 'minergie' = 'minergie'. */
export function applySanierung(bauklasse, sanierungsstand){
  if (!bauklasse) return null;
  const order = ['vor1945','1946_1960','1961_1977','1978_1994',
                 '1995_2000','2001_2009','2010_2015','2016_heute','minergie'];
  switch (sanierungsstand){
    case 'minergie':    return 'minergie';
    case 'saniert':     return '2010_2015';
    case 'teilsaniert': {
      const i = order.indexOf(bauklasse);
      return i < 0 ? bauklasse : order[Math.min(order.length-1, i+1)];
    }
    case 'unsaniert':
    default:            return bauklasse;
  }
}

/* ==========================================================================
   U-WERT LOOKUP
   ========================================================================== */

/** Liest typischen U-Wert eines Bauteils aus u-werte.json.
 *  @param data       u-werte.json
 *  @param bauteil    'wand' | 'dach' | 'boden' | 'fenster'
 *  @param gebaeudetyp 'EFH' | 'MFH'
 *  @param bauklasse  'vor1945' | '1946_1960' | ... | 'minergie'
 *  @param variant    Sub-key bei dach/boden/fenster (Default sinnvoll).
 *  @returns { typ, min, max, gen? } oder null bei Lookup-Fail. */
export function lookupUWert(data, { bauteil, gebaeudetyp, bauklasse, variant }){
  if (!data || !bauklasse) return null;
  const typeKey = String(gebaeudetyp || 'EFH').toUpperCase();

  if (bauteil === 'wand'){
    const node = data.wandUWert?.[typeKey]?.[bauklasse];
    if (!node) return null;
    return { typ: node.typ ?? null, min: node.min ?? null, max: node.max ?? null };
  }
  if (bauteil === 'dach'){
    const v = variant || 'steildach';
    const node = data.dachUWert?.[v]?.[bauklasse];
    if (!node) return null;
    return { typ: node.typ ?? null, min: node.min ?? null, max: node.max ?? null };
  }
  if (bauteil === 'boden'){
    const v = variant || 'gegenErdreich';
    const node = data.bodenUWert?.[v]?.[bauklasse];
    if (!node) return null;
    return { typ: node.typ ?? null, min: node.min ?? null, max: node.max ?? null };
  }
  if (bauteil === 'fenster'){
    const gen = variant || data.fensterGenerationDefault?.[bauklasse] || null;
    if (gen && data.fensterGenerationen?.[gen]?.uw != null){
      return { typ: data.fensterGenerationen[gen].uw, min: null, max: null, gen };
    }
    if (gen && data.fensterUWert?.[gen]){
      const node = data.fensterUWert[gen];
      return {
        typ: node.uFenster_kunststoff?.typ ?? node.uFenster_holz?.typ ?? null,
        min: node.uFenster_kunststoff?.min ?? null,
        max: node.uFenster_kunststoff?.max ?? null
      };
    }
    return null;
  }
  return null;
}

/* ==========================================================================
   SCHICHT-AUFBAU → U-WERT (DIN EN ISO 6946)
   ========================================================================== */

/** RT = Rsi + Σ(d/λ) + Rse, U = 1/RT.
 *  @param layers   [{ d:[m], lambda:[W/(m·K)] }, ...]
 *  @param Rsi/Rse  Übergangswiderstände in m²·K/W. Defaults: horizontal (0.13/0.04). */
export function uFromLayers(layers, Rsi = 0.13, Rse = 0.04){
  if (!Array.isArray(layers) || layers.length === 0) return null;
  let R = Rsi + Rse;
  for (const L of layers){
    const d = Number(L?.d), lam = Number(L?.lambda);
    if (!Number.isFinite(d) || !Number.isFinite(lam) || lam <= 0) continue;
    R += d / lam;
  }
  return R > 0 ? 1 / R : null;
}

/** Übergangswiderstands-Konvention (DIN EN ISO 6946). */
export const RSI_RSE = {
  horizontal: { Rsi: 0.13, Rse: 0.04 },
  aufwaerts:  { Rsi: 0.10, Rse: 0.04 },
  abwaerts:   { Rsi: 0.17, Rse: 0.04 }
};

/** Bauteil-Default aus u-werte.json `bauteilDefaults` zu Schichten ausbauen.
 *  daemmstoffeKatalog (data.daemmstoffe) liefert λ pro Material-Key. */
export function defaultLayersForBauteil(data, { bauteil, bauklasse, gedaemmt = false }){
  const root = data?.bauteilDefaults?.[bauteil];
  const node = root?.[bauklasse];
  if (!node) return null;
  const layers = [];
  if (node.putzAussen)  layers.push({ d: node.putzAussen.d,  lambda: node.putzAussen.lambda });
  if (node.tragschicht) layers.push({ d: node.tragschicht.d, lambda: node.tragschicht.lambda });
  if (node.putzInnen)   layers.push({ d: node.putzInnen.d,   lambda: node.putzInnen.lambda });
  if (gedaemmt && node.daemmung){
    const matKey = node.daemmung.material;
    const lam = data?.daemmstoffe?.[matKey]?.lambda;
    if (lam && node.daemmung.dicke > 0){
      layers.push({ d: node.daemmung.dicke, lambda: lam });
    }
  }
  return layers;
}

/* ==========================================================================
   HÜLLFLÄCHEN
   ========================================================================== */

/** Aggregiert Bauteilflächen pro Typ.
 *  bauteile = [{ typ:'AW'|'AF'|'DE'|'FB'|'IW'|'IT', A:[m²] }, ...] */
export function aggregateAreas(bauteile){
  const out = {};
  if (!Array.isArray(bauteile)) return out;
  for (const b of bauteile){
    const A = Number(b?.A);
    if (!Number.isFinite(A) || A <= 0) continue;
    const key = String(b.typ || 'unbekannt');
    out[key] = (out[key] || 0) + A;
  }
  return out;
}

/** Umfassungsfläche A_um = Σ A für Bauteile, die als Hülle zählen. */
export function huellflaeche(bauteile, includeTypes = ['AW','AF','DE','FB','AT']){
  if (!Array.isArray(bauteile)) return 0;
  return bauteile.reduce((s, b) => {
    if (!includeTypes.includes(b?.typ)) return s;
    const A = Number(b?.A);
    return s + (Number.isFinite(A) && A > 0 ? A : 0);
  }, 0);
}

/** Volumen aus Geometrie. Akzeptiert {V} oder {A,h} oder {l,b,h}. */
export function raumVolumen(g){
  if (!g) return 0;
  const V = Number(g.V);
  if (Number.isFinite(V) && V > 0) return V;
  const A = Number(g.A);
  const h = Number(g.h);
  if (Number.isFinite(A) && A > 0 && Number.isFinite(h) && h > 0) return A * h;
  const l = Number(g.l), b = Number(g.b);
  if (Number.isFinite(l) && Number.isFinite(b) && Number.isFinite(h) && l > 0 && b > 0 && h > 0){
    return l * b * h;
  }
  return 0;
}

/** Fläche aus Geometrie. Akzeptiert {A} oder {l,b}. */
export function raumFlaeche(g){
  if (!g) return 0;
  const A = Number(g.A);
  if (Number.isFinite(A) && A > 0) return A;
  const l = Number(g.l), b = Number(g.b);
  if (Number.isFinite(l) && Number.isFinite(b) && l > 0 && b > 0) return l * b;
  return 0;
}

/* ==========================================================================
   MATERIAL-PICKER HELPERS (portiert aus Heizlast Pro · 2026-04-29 Session 2)
   ==========================================================================
   Additive Exports fuer src/calc/material-picker.mjs (5-Stufen-Picker:
   Bauweise -> Dicke -> Daemmung j/n -> Material -> Dicke).
   Quelle: Heizlast Pro/calc/envelope.mjs (Phase 12.5a / Refactor S2).
   Bestehende Exports (bauklasseFromBaujahr, lookupUWert, uFromLayers,
   defaultLayersForBauteil, RSI_RSE, etc.) bleiben unveraendert.
   ========================================================================== */

/** Alias auf bauklasseFromBaujahr — die Pro-API verwendet `baujahrklasse`. */
export const baujahrklasse = bauklasseFromBaujahr;

/* --------------------------------------------------------------------------
   DAEMMSTOFFE-Katalog (W/m·K) — synchron mit data/u-werte.json `daemmstoffe`.
   -------------------------------------------------------------------------- */
export const DAEMMSTOFFE = {
  mineralwolle: { label: 'Mineralwolle',                lambda: 0.040 },
  eps:          { label: 'EPS (Polystyrol)',            lambda: 0.038 },
  xps:          { label: 'XPS',                          lambda: 0.034 },
  pur:          { label: 'PUR/PIR',                      lambda: 0.025 },
  holzfaser:    { label: 'Holzfaser',                    lambda: 0.045 },
  unbekannt:    { label: 'unbekannt / nicht prüfbar',    lambda: 0.045 },
};

/* --------------------------------------------------------------------------
   BAUTEIL_DEFAULTS — Default-Schichtsaetze pro Bauteil-Typ x Baujahrsklasse.
   Synchron mit data/u-werte.json `bauteilDefaults`. Dicke in Metern.
   -------------------------------------------------------------------------- */
const TR_VOLLZIEGEL_50  = { label: 'Vollziegel/Naturstein 50 cm', lambda: 0.81, d: 0.50 };
const TR_BACKSTEIN_30   = { label: 'Backstein 30 cm',             lambda: 0.81, d: 0.30 };
const TR_HLZ_30         = { label: 'Hochlochziegel 30 cm',        lambda: 0.40, d: 0.30 };
const TR_HLZ_24         = { label: 'Hochlochziegel 24 cm',        lambda: 0.29, d: 0.24 };
const TR_HLZ_175        = { label: 'Hochlochziegel 17,5 cm',      lambda: 0.29, d: 0.175 };
const TR_SPARREN        = { label: 'Holzsparren + Schalung',      lambda: 0.13, d: 0.025 };
const TR_BETONPLATTE_180= { label: 'Stahlbetonplatte 18 cm',      lambda: 1.70, d: 0.18 };
const TR_BETONPLATTE_200= { label: 'Stahlbetonplatte 20 cm',      lambda: 1.70, d: 0.20 };
const PUTZ_INNEN_15     = { label: 'Innenputz Kalkgips 15 mm',    lambda: 0.70, d: 0.015 };
const PUTZ_INNEN_20     = { label: 'Innenputz Kalkgips 20 mm',    lambda: 0.70, d: 0.020 };
const PUTZ_AUSSEN_10    = { label: 'Aussenputz Zement 10 mm',     lambda: 1.00, d: 0.010 };
const PUTZ_AUSSEN_15    = { label: 'Aussenputz Zement 15 mm',     lambda: 1.00, d: 0.015 };
const PUTZ_AUSSEN_20    = { label: 'Aussenputz Zement 20 mm',     lambda: 1.00, d: 0.020 };

export const BAUTEIL_DEFAULTS = {
  aussenwand: {
    vor1945:     { tragschicht: TR_VOLLZIEGEL_50, putzInnen: PUTZ_INNEN_20, putzAussen: PUTZ_AUSSEN_20, daemmung: { material: 'mineralwolle', dicke: 0.04 }, beschreibung: 'Bruchstein-/Vollziegel ungedaemmt; bei Sanierung typisch 4 cm Aussendaemmung.' },
    '1946_1960': { tragschicht: TR_BACKSTEIN_30,  putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_20, daemmung: { material: 'mineralwolle', dicke: 0.06 }, beschreibung: 'Backsteinmauerwerk ohne Daemmung; Sanierung typisch 6 cm WDVS.' },
    '1961_1977': { tragschicht: TR_HLZ_30,        putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_15, daemmung: { material: 'mineralwolle', dicke: 0.06 }, beschreibung: 'Hochloch-Ziegelmauerwerk, Erstdaemmung dünn oder fehlend. Sanierungs-Standard 1990er: 6 cm Mineralwolle.' },
    '1978_1994': { tragschicht: TR_HLZ_24,        putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_15, daemmung: { material: 'mineralwolle', dicke: 0.08 }, beschreibung: 'Massivbau mit erster Aussendaemmung 6-10 cm Mineralwolle/EPS.' },
    '1995_2000': { tragschicht: TR_HLZ_175,       putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_10, daemmung: { material: 'eps',          dicke: 0.12 }, beschreibung: 'WDVS Standard SIA 380/1 1995, 12 cm EPS.' },
    '2001_2009': { tragschicht: TR_HLZ_175,       putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_10, daemmung: { material: 'eps',          dicke: 0.14 }, beschreibung: 'MuKEn 2008, 14 cm EPS auf Massiv-Mauerwerk.' },
    '2010_2015': { tragschicht: TR_HLZ_175,       putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_10, daemmung: { material: 'eps',          dicke: 0.16 }, beschreibung: 'MuKEn 2014, 16 cm EPS oder Mineralwolle.' },
    '2016_heute':{ tragschicht: TR_HLZ_175,       putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_10, daemmung: { material: 'eps',          dicke: 0.18 }, beschreibung: 'Aktueller MuKEn-Standard, 18 cm EPS.' },
    minergie:    { tragschicht: TR_HLZ_175,       putzInnen: PUTZ_INNEN_15, putzAussen: PUTZ_AUSSEN_10, daemmung: { material: 'pur',          dicke: 0.22 }, beschreibung: 'Minergie-/Minergie-P-Standard, 22 cm PUR oder hochwertige Mineralwolle.' },
  },
  dach: {
    vor1945:     { tragschicht: TR_SPARREN, daemmung: { material: 'mineralwolle', dicke: 0.10 }, beschreibung: 'Steildach urspruenglich ungedaemmt; Sanierungs-Default 10 cm Zwischensparren.' },
    '1946_1960': { tragschicht: TR_SPARREN, daemmung: { material: 'mineralwolle', dicke: 0.12 }, beschreibung: 'Sanierung typisch 12 cm Mineralwolle Zwischensparren.' },
    '1961_1977': { tragschicht: TR_SPARREN, daemmung: { material: 'mineralwolle', dicke: 0.14 }, beschreibung: 'Erste Zwischensparrendaemmung dünn; Sanierungs-Standard 14 cm.' },
    '1978_1994': { tragschicht: TR_SPARREN, daemmung: { material: 'mineralwolle', dicke: 0.16 }, beschreibung: 'Standard-Zwischensparren 16 cm.' },
    '1995_2000': { tragschicht: TR_SPARREN, daemmung: { material: 'mineralwolle', dicke: 0.20 }, beschreibung: 'SIA 380/1 1995 mit 20 cm Mineralwolle.' },
    '2001_2009': { tragschicht: TR_SPARREN, daemmung: { material: 'mineralwolle', dicke: 0.22 }, beschreibung: 'MuKEn 2008, 22 cm Mineralwolle.' },
    '2010_2015': { tragschicht: TR_SPARREN, daemmung: { material: 'mineralwolle', dicke: 0.24 }, beschreibung: 'MuKEn 2014, 24 cm Zwischensparren + Aufsparren.' },
    '2016_heute':{ tragschicht: TR_SPARREN, daemmung: { material: 'pur',          dicke: 0.20 }, beschreibung: 'Aktueller Standard mit PUR-Aufsparren.' },
    minergie:    { tragschicht: TR_SPARREN, daemmung: { material: 'pur',          dicke: 0.26 }, beschreibung: 'Minergie-P, 26 cm PUR oder hochwertig Mineralwolle.' },
  },
  boden: {
    vor1945:     { tragschicht: TR_BETONPLATTE_200, daemmung: { material: 'eps', dicke: 0.04 }, beschreibung: 'Massive Bodenplatte ungedaemmt; Sanierung typisch 4 cm EPS auf Kellerdecke (von oben).' },
    '1946_1960': { tragschicht: TR_BETONPLATTE_180, daemmung: { material: 'eps', dicke: 0.06 }, beschreibung: 'Sanierung typisch 6 cm EPS.' },
    '1961_1977': { tragschicht: TR_BETONPLATTE_180, daemmung: { material: 'eps', dicke: 0.08 }, beschreibung: 'Erstdaemmung Bodenplatte dünn; Sanierung 8 cm EPS.' },
    '1978_1994': { tragschicht: TR_BETONPLATTE_180, daemmung: { material: 'eps', dicke: 0.08 }, beschreibung: 'Standard 8 cm EPS unter Estrich.' },
    '1995_2000': { tragschicht: TR_BETONPLATTE_200, daemmung: { material: 'eps', dicke: 0.10 }, beschreibung: 'SIA 380/1 1995, 10 cm EPS.' },
    '2001_2009': { tragschicht: TR_BETONPLATTE_200, daemmung: { material: 'xps', dicke: 0.12 }, beschreibung: 'MuKEn 2008, 12 cm XPS Perimeter.' },
    '2010_2015': { tragschicht: TR_BETONPLATTE_200, daemmung: { material: 'xps', dicke: 0.14 }, beschreibung: 'MuKEn 2014, 14 cm XPS.' },
    '2016_heute':{ tragschicht: TR_BETONPLATTE_200, daemmung: { material: 'xps', dicke: 0.16 }, beschreibung: 'Aktueller Standard 16 cm XPS.' },
    minergie:    { tragschicht: TR_BETONPLATTE_200, daemmung: { material: 'xps', dicke: 0.20 }, beschreibung: 'Minergie-P, 20 cm XPS.' },
  },
};

/** Tiefe Kopie eines Default-Schichtsatzes — UI-Aufrufer kann override-editen. */
export function bauteilDefaultsFor(bauteilTyp, bk) {
  const set = BAUTEIL_DEFAULTS[bauteilTyp]?.[bk];
  if (!set) return null;
  return JSON.parse(JSON.stringify(set));
}

/* --------------------------------------------------------------------------
   uWertAusSchichten — vereinfachte Schicht-API der Default-Kaskade.
   Schichten von innen nach aussen, je entweder
     { material: 'mineralwolle' | ... , d: m }   (Lookup in DAEMMSTOFFE), oder
     { lambda: W/mK,                  d: m }   (Tragschicht / Putz, direkt).
   Verwendet die Tool-eigene RSI_RSE-Tabelle (Rsi/Rse Camel-Case).
   -------------------------------------------------------------------------- */
export function uWertAusSchichten(schichten, opts = {}) {
  const dir = opts.direction || 'horizontal';
  const rsiRse = RSI_RSE[dir] || RSI_RSE.horizontal;
  const list = Array.isArray(schichten) ? schichten : [];
  let sumR = 0;
  const enriched = list.map((s, i) => {
    let lambda = null, label = null, materialKey = null;
    if (s && typeof s === 'object') {
      if (typeof s.material === 'string' && DAEMMSTOFFE[s.material]) {
        materialKey = s.material;
        lambda = DAEMMSTOFFE[s.material].lambda;
        label = DAEMMSTOFFE[s.material].label;
      } else if (typeof s.lambda === 'number' && isFinite(s.lambda)) {
        lambda = s.lambda;
        label = s.label || null;
      }
    }
    const d = Number(s && s.d) || 0;
    let r = 0;
    if (lambda > 0 && d > 0) r = d / lambda;
    sumR += r;
    return { idx: i, material: materialKey, label, lambda, d, r };
  });
  const rTotal = rsiRse.Rsi + sumR + rsiRse.Rse;
  const U = rTotal > 0 ? 1 / rTotal : null;
  const marker = opts.markerSource || 'baujahr';
  return { U, lambdaTotalReziprok: rTotal, marker, schichten: enriched };
}

/* --------------------------------------------------------------------------
   BAUJAHR_UWERT + uValueFallback — Fallback-U-Wert aus Baujahrsklasse.
   Wird vom Material-Picker bei „voll-unbekannt" angerufen, statt eine
   fragwuerdige Schicht-Rekonstruktion zu bauen.
   -------------------------------------------------------------------------- */
export const BAUJAHR_UWERT = {
  wandUWert: {
    EFH: {
      vor1945:{typ:1.8},'1946_1960':{typ:1.2},'1961_1977':{typ:0.6},
      '1978_1994':{typ:0.5},'1995_2000':{typ:0.25},'2001_2009':{typ:0.2},
      '2010_2015':{typ:0.2},'2016_heute':{typ:0.17}, minergie:{typ:0.15}
    },
    MFH: {
      vor1945:{typ:1.8},'1946_1960':{typ:1.2},'1961_1977':{typ:0.6},
      '1978_1994':{typ:0.5},'1995_2000':{typ:0.25},'2001_2009':{typ:0.2},
      '2010_2015':{typ:0.2},'2016_heute':{typ:0.17}, minergie:{typ:0.15}
    }
  },
  dachUWert: {
    steildach:{vor1945:{typ:1.5},'1946_1960':{typ:1.2},'1961_1977':{typ:0.8},'1978_1994':{typ:0.5},'1995_2000':{typ:0.25},'2001_2009':{typ:0.2},'2010_2015':{typ:0.2},'2016_heute':{typ:0.17},minergie:{typ:0.15}},
    flachdach:{vor1945:{typ:1.4},'1946_1960':{typ:1.4},'1961_1977':{typ:1.0},'1978_1994':{typ:0.6},'1995_2000':{typ:0.25},'2001_2009':{typ:0.2},'2010_2015':{typ:0.2},'2016_heute':{typ:0.17},minergie:{typ:0.15}},
    pultdach: {vor1945:{typ:1.5},'1946_1960':{typ:1.2},'1961_1977':{typ:0.8},'1978_1994':{typ:0.5},'1995_2000':{typ:0.25},'2001_2009':{typ:0.2},'2010_2015':{typ:0.2},'2016_heute':{typ:0.17},minergie:{typ:0.15}}
  },
  bodenUWert: {
    gegenErdreich:     {vor1945:{typ:1.3},'1946_1960':{typ:1.1},'1961_1977':{typ:0.8},'1978_1994':{typ:0.5},'1995_2000':{typ:0.25},'2001_2009':{typ:0.25},'2010_2015':{typ:0.25},'2016_heute':{typ:0.25},minergie:{typ:0.2}},
    unbeheizterKeller: {vor1945:{typ:1.3},'1946_1960':{typ:1.1},'1961_1977':{typ:0.8},'1978_1994':{typ:0.5},'1995_2000':{typ:0.25},'2001_2009':{typ:0.25},'2010_2015':{typ:0.25},'2016_heute':{typ:0.25},minergie:{typ:0.2}}
  },
  fensterUWert: {
    einfachverglasung:             {uFenster_holz:{typ:4.7}},
    isolierglas_2fach_ohne_low_e:  {uFenster_holz:{typ:2.7}},
    isolierglas_2fach_low_e_argon: {uFenster_holz:{typ:1.3}},
    isolierglas_3fach_standard:    {uFenster_holz:{typ:0.9}},
    isolierglas_3fach_high_end:    {uFenster_holz:{typ:0.8}}
  }
};

export function uValueFallback(params) {
  const bk = baujahrklasse(params.baujahr);
  const result = (u) => ({ u, baujahrklasse: bk, quelle: 'fallback_baujahr' });
  if (!bk) return result(null);
  switch (params.bauteilTyp) {
    case 'aussenwand': {
      const cat = params.gebaeudetyp === 'MFH' ? 'MFH' : 'EFH';
      return result(BAUJAHR_UWERT.wandUWert[cat]?.[bk]?.typ ?? null);
    }
    case 'dach': {
      const form = params.dachform === 'flachdach' ? 'flachdach'
                 : params.dachform === 'pultdach'  ? 'pultdach'
                 : 'steildach';
      return result(BAUJAHR_UWERT.dachUWert[form]?.[bk]?.typ ?? null);
    }
    case 'kellerdecke':
      return result(BAUJAHR_UWERT.bodenUWert.unbeheizterKeller?.[bk]?.typ ?? null);
    case 'bodenPlatte':
      return result(BAUJAHR_UWERT.bodenUWert.gegenErdreich?.[bk]?.typ ?? null);
    case 'fenster': {
      const t = params.fenstertyp && BAUJAHR_UWERT.fensterUWert[params.fenstertyp];
      if (t) return result(t.uFenster_holz?.typ ?? null);
      const y = parseInt(params.baujahr, 10);
      if (!isFinite(y)) return result(null);
      if (y < 1975) return result(BAUJAHR_UWERT.fensterUWert.einfachverglasung.uFenster_holz.typ);
      if (y < 1995) return result(BAUJAHR_UWERT.fensterUWert.isolierglas_2fach_ohne_low_e.uFenster_holz.typ);
      if (y < 2005) return result(BAUJAHR_UWERT.fensterUWert.isolierglas_2fach_low_e_argon.uFenster_holz.typ);
      if (y < 2015) return result(BAUJAHR_UWERT.fensterUWert.isolierglas_3fach_standard.uFenster_holz.typ);
      return result(BAUJAHR_UWERT.fensterUWert.isolierglas_3fach_high_end.uFenster_holz.typ);
    }
    default:
      return result(null);
  }
}

/* --------------------------------------------------------------------------
   FENSTER_GENERATIONEN — Generationen-Lookup (Uw direkt). Synchron mit
   data/u-werte.json `fensterGenerationen`.
   -------------------------------------------------------------------------- */
export const FENSTER_GENERATIONEN = {
  einfach:               { label: 'Einfachverglasung (vor 1975)',             uw: 5.20 },
  '2fach_unbeschichtet': { label: '2-fach unbeschichtet (1975-1995)',         uw: 2.80 },
  '2fach_low_e':         { label: '2-fach Low-E + Argon (1995-2005)',         uw: 1.30 },
  '3fach':               { label: '3-fach Standard (2005-2015)',              uw: 0.95 },
  '3fach_passiv':        { label: '3-fach Passivhaus / Minergie-P (ab 2010)', uw: 0.80 },
  unbekannt:             { label: 'unbekannt / nicht prüfbar (konservativ)',  uw: 2.80 },
};
