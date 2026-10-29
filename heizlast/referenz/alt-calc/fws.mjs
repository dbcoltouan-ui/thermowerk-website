// src/calc/fws.mjs
// FWS-Rechenkern (Cascade) — 1:1 portiert aus reference/fws-original.html
// Pure Funktionen, keine DOM-/localStorage-Zugriffe.
// Quelle: reference/FWS-RECHENWEGE.md, reference/BEISPIELRECHNUNG.md.
//
// Eingabe: Datenstruktur `state` (siehe FRESH_STATE-Skizze unten).
// Ausgabe: { Qhl, Qw, Qoff, Qh, QnWW, VW_Sto, ... } in compute(state).
//
// AUDIT 3.8 / S1: Plausi-Logik wurde nach `plausi.mjs` verschoben.
// Re-Export hier für Backwards-Compat (Tests + Bundle-IIFEs).

import { plausiAmpel as _plausiAmpel,
         computePlausi as _computePlausi,
         SPEZ_BAND as _SPEZ_BAND } from './plausi.mjs';
export const SPEZ_BAND = _SPEZ_BAND;
export const plausiAmpel = _plausiAmpel;
export const computePlausi = _computePlausi;

/* ==========================================================================
   KONSTANTEN — Heizwerte (Hi), Konvention suissetec-FWS-Online-Tool.
   Die alte Property `Ho` heisst jetzt `Hi` und enthält den unteren Heizwert.
   Backwards-Compat: ein nicht-aufzählbarer Getter `Ho` liefert denselben Zahlenwert.
   ========================================================================== */

export const HEIZWERT = {
  heizoel:   { name: 'Heizöl EL',            unit: 'l',     Hi: 9.91,
    etaPresets: [
      { key:'brennwert',   label:'neueres Modell, kondensierend', eta:0.95 },
      { key:'alt_ohneWW',  label:'älter, ohne WW',                eta:0.85 },
      { key:'alt_mitWW',   label:'älter, mit WW',                 eta:0.75 },
      { key:'custom',      label:'Eigener Wert…',                 eta:null }
    ] },
  erdgas:    { name: 'Erdgas',               unit: 'mn³',   Hi: 10.04,
    etaPresets: [
      { key:'brennwert',   label:'neueres Modell, kondensierend', eta:0.95 },
      { key:'alt_ohneWW',  label:'älter, ohne WW',                eta:0.85 },
      { key:'alt_mitWW',   label:'älter, mit WW',                 eta:0.75 },
      { key:'custom',      label:'Eigener Wert…',                 eta:null }
    ] },
  pellets:   { name: 'Pellets',              unit: 'kg',    Hi: 5.0,
    etaPresets: [
      { key:'neu',         label:'Pelletkessel (neu)',            eta:0.72 },
      { key:'standard',    label:'Pelletkessel (Standard)',       eta:0.68 },
      { key:'custom',      label:'Eigener Wert…',                 eta:null }
    ] },
  hartholz:  { name: 'Hartholz (Stückholz)', unit: 'Ster',  Hi: 2500,
    etaPresets: [
      { key:'neu',         label:'Holzkessel neu',                eta:0.72 },
      { key:'alt',         label:'Holzkessel alt',                eta:0.55 },
      { key:'custom',      label:'Eigener Wert…',                 eta:null }
    ] },
  nadelholz: { name: 'Nadelholz (Stückholz)', unit: 'Ster', Hi: 1800,
    etaPresets: [
      { key:'neu',         label:'Holzkessel neu',                eta:0.72 },
      { key:'alt',         label:'Holzkessel alt',                eta:0.55 },
      { key:'custom',      label:'Eigener Wert…',                 eta:null }
    ] },
  strom:     { name: 'Strom (Elektrospeicher)', unit: 'kWh', Hi: 1.0,
    etaPresets: [
      { key:'direkt',      label:'Elektrospeicher',               eta:0.95 },
      { key:'custom',      label:'Eigener Wert…',                 eta:null }
    ] },
  fernwaerme:{ name: 'Fernwärme',            unit: 'kWh',   Hi: 1.0,
    etaPresets: [
      { key:'fern',        label:'Fernwärme',                     eta:1.00 },
      { key:'custom',      label:'Eigener Wert…',                 eta:null }
    ] }
};

// Backwards-Compat: alter Property-Name `Ho` als Alias auf `Hi` (Read-only).
// Externe Module / Tests, die noch h.Ho lesen, bekommen denselben Zahlenwert.
for (const k of Object.keys(HEIZWERT)){
  Object.defineProperty(HEIZWERT[k], 'Ho', {
    get(){ return this.Hi; },
    enumerable: false, configurable: true
  });
}

export const WW_PERSON_PRESETS = [
  { key:'sparsam',  label:'Sparsam (Dusche)',     lPd: 30 },
  { key:'normal',   label:'Normal',               lPd: 40 },
  { key:'komfort',  label:'Komfort (inkl. Bad)',  lPd: 55 },
  { key:'custom',   label:'Eigener Wert…',        lPd: null }
];

// FWS §3 — Vollbetriebsstunden tvoll [h/a], "Wohngebäude ohne WW-Anteil"
export const TVOLL_TABLE = {
  mittelland: { efh: 2000, mfh: 1900 },
  alpen:      { efh: 2300, mfh: 2200 },
  jura:       { efh: 2200, mfh: 2100 }
};

// Bauperiode × Gebäudetyp — Richtwerte kWh/m²·a (Schneider 2014)
export const BAUPERIODE_KWH = {
  '<1919':      { efh: [55,  125], mfh: [65,  115] },
  '1919-1945':  { efh: [80,  135], mfh: [80,  120] },
  '1946-1960':  { efh: [80,  140], mfh: [70,  115] },
  '1961-1970':  { efh: [80,  145], mfh: [75,  120] },
  '1971-1980':  { efh: [70,  125], mfh: [75,  115] },
  '1981-1985':  { efh: [55,  105], mfh: [70,  105] },
  '1986-1990':  { efh: [60,   95], mfh: [65,   95] },
  '1991-1995':  { efh: [50,   90], mfh: [60,   85] },
  '1996-2000':  { efh: [45,   85], mfh: [55,   75] },
  '2001-2005':  { efh: [35,   80], mfh: [55,   75] },
  '2006-2010':  { efh: [35,   75], mfh: [45,   65] },
  '2011-heute': { efh: [30,   45], mfh: [30,   40] }
};

// Bauperiode × Gebäudetyp — spezifische Heizlast-Bänder W/m² (Plausi-Quercheck)
// → Verschoben nach `./plausi.mjs` (S1 / AUDIT 3.8). Re-Export oben.

export const TOFF_DEFAULTS = { werktag: 2, sonntag: 4, keine: 0 };

export const SANIERUNG_PRESETS = [
  { key:'fenster',  label:'Fenster ersetzt (U<1.3)',        proz: 15 },
  { key:'dach',     label:'Dach / Estrichboden gedämmt',     proz: 12 },
  { key:'fassade',  label:'Fassade gedämmt',                 proz: 32 },
  { key:'keller',   label:'Kellerdecke gedämmt',             proz: 10 },
  { key:'wmz',      label:'Wärmerückgewinnung / KWL',        proz: 8  },
  { key:'other',    label:'Individuell',                     proz: 0  }
];

export const F_STO_PRESETS = [
  { key:'innen',  label:'Innenliegender WT (Misch- + Kaltzone)',     fSto: 1.25 },
  { key:'aussen', label:'Aussenliegender WT (nur Mischzone)',         fSto: 1.10 },
  { key:'ohne',   label:'Keine Misch-/Kaltzone (ideale Schichtung)',  fSto: 1.00 }
];

export const A_WT_PRESETS = [
  { key:'innen-warmhaltung', label:'Innen 65/60 °C (mit Warmhaltung)',  faktor: 0.65 },
  { key:'innen-65-55',       label:'Innen 65/55 °C (ohne Warmhaltung)', faktor: 0.40 },
  { key:'innen-60-55',       label:'Innen 60/55 °C (ohne Warmhaltung)', faktor: 0.65 },
  { key:'aussen',            label:'Aussen / FRIWA / Magro-Ladung',     faktor: 0.05 }
];

/* ==========================================================================
   UTIL
   ========================================================================== */

/** Robust number coerce (akzeptiert auch '1,5'). */
export function num(v){
  if (v==='' || v==null) return 0;
  const n = typeof v==='number' ? v : parseFloat(String(v).replace(',','.'));
  return Number.isFinite(n) ? n : 0;
}

function periodDays(p){
  if (!p?.von || !p?.bis) return 365;
  const dv = new Date(p.von), db = new Date(p.bis);
  if (isNaN(dv) || isNaN(db)) return 365;
  const diff = Math.round((db - dv) / 86400000) + 1;
  return diff>0 ? diff : 365;
}

function periodMonths(p){
  return periodDays(p) / 30.4375;
}

/** Effektive η einer Periode: Preset oder Override. */
export function periodEta(p){
  const h = HEIZWERT[p?.energy];
  if (!h) return 0;
  const ovRaw = p.etaValue;
  const ov = num(ovRaw);
  if (ovRaw!=='' && ovRaw!=null && ov>0) return ov;
  const ps = (h.etaPresets||[]).find(x=>x.key===p.etaPreset);
  if (ps && ps.eta!=null) return ps.eta;
  const fall = (h.etaPresets||[]).find(x=>x.eta!=null);
  return fall ? fall.eta : 1.0;
}

/* ==========================================================================
   PRIMITIV-FORMELN (ohne State)
   ========================================================================== */

/** FWS §8: Qn,WW Jahres-Kompaktformel.
 *  V [l/d] · cp · ΔT/3600 · Π(1+f) · 365 [kWh/a] */
export function qnwwJahr({ V_l_d, cp = 4.2, dT = 50, fSpeicher = 0, fZirk = 0, fAusstoss = 0 }){
  if (!(V_l_d > 0)) return 0;
  const base = V_l_d * cp * dT / 3600 * 365;
  const factor = (1 + fSpeicher/100) * (1 + fZirk/100) * (1 + fAusstoss/100);
  return base * factor;
}

/** FWS §3: Qhl = Qn,H / tvoll. */
export function qhlAusQn({ QnH, tvoll }){
  if (!(tvoll > 0) || !(QnH > 0)) return 0;
  return QnH / tvoll;
}

/** FWS §9: Qw — WW-Zuschlag.
 *  td = QWW_Tag/Qhl, geclampt auf [0, 12]; Qw = Qhl·(24/(24-td) − 1). */
export function qwDetail({ Qhl, QnWW }){
  if (!(Qhl > 0) || !(QnWW > 0)) return { Qw: 0, td: 0, tdRaw: 0, tdClamped: false };
  const QWW_Tag = QnWW / 365;
  const tdRaw = QWW_Tag / Qhl;
  const td = Math.max(0, Math.min(12, tdRaw));
  const tdClamped = tdRaw > 12;
  const Qw = Qhl * (24/(24 - td) - 1);
  return { Qw, td, tdRaw, tdClamped };
}

/** FWS §4: Qoff — Sperrzeit-Zuschlag (toff in h/d). */
export function qoffFormel({ Qhl, toff }){
  if (!(Qhl > 0) || !(toff > 0)) return 0;
  if (toff >= 23.5) return Qhl * 10;
  return Qhl * (24/(24 - toff) - 1);
}

/** FWS §10: WW-Speichervolumen [l], gerundet 10-L-Schritte aufwärts.
 *  V = QWW_Tag / (cp·ΔT/3600), · fSto. */
export function speichervolumen({ QWW_Tag, cp = 4.2, dT = 50, fSto = 1.0 }){
  if (!(QWW_Tag > 0) || !(dT > 0)) return 0;
  const V = QWW_Tag / (cp * dT / 3600);
  return Math.ceil(V * fSto / 10) * 10;
}

// FWS §7 / §12.4: Plausi-Ampel gegen SPEZ_BAND.
// → Verschoben nach `./plausi.mjs` (S1 / AUDIT 3.8). Re-Export oben.

/* ==========================================================================
   STATE-BASIERTE FUNKTIONEN
   ========================================================================== */

/** Annualisierte Energie aus Brennstoff-Perioden.
 *  Qn = Σ [ Menge_Periode × (365/Tage_Periode) × Hi × η_Periode ]
 *  Heizwert (Hi) ist konsistent mit suissetec-FWS-Online-Tool. */
export function computeQnVerbrauch(s){
  let Qn = 0;
  (s?.heizung?.perioden || []).forEach(p => {
    const h = HEIZWERT[p.energy];
    if (!h) return;
    const menge = num(p.menge);
    if (menge <= 0) return;
    const d = periodDays(p);
    const annual = menge * (365 / d);
    const eta = periodEta(p);
    Qn += annual * h.Hi * eta;
  });
  return Qn;
}

/** WW-Tagesvolumen aus state (modus 'direkt' oder 'personen'). */
export function effectiveVWu(s){
  const ww = s?.warmwasser || {};
  if (ww.modus === 'personen'){
    const pers = num(ww.personen);
    const lp   = num(ww.lProPerson) || 40;
    return pers * lp;
  }
  return num(ww.VW_u);
}

/** Rohe WW-Jahresenergie ohne Sektion-3-Gate (für WP-Q_w / Speicher). */
export function computeQnWWRaw(s){
  const V = effectiveVWu(s);
  if (V <= 0) return 0;
  const ww = s?.warmwasser || {};
  return qnwwJahr({
    V_l_d: V,
    cp: 4.2,
    dT: num(ww.dT) || 50,
    fSpeicher: num(ww.speicherverluste),
    fZirk: num(ww.zirkulation),
    fAusstoss: num(ww.ausstoss)
  });
}

/** Tagesvolumen für den VERBRAUCHS-WW-Abzug (eigener State-Block, völlig
 *  unabhängig von der WP-WW-Auslegung). Backwards-compat: fällt auf
 *  state.warmwasser zurück, wenn der `verbrauch_ww`-Block leer ist
 *  (V_W,u = 0 UND personen = 0) — alte Projekte funktionieren weiter. */
export function effectiveVWuVerbrauch(s){
  const vw = s?.heizung?.verbrauch_ww || {};
  let V = 0;
  if (vw.modus === 'personen'){
    const pers = num(vw.personen);
    const lp   = num(vw.lProPerson) || 40;
    V = pers * lp;
  } else {
    V = num(vw.VW_u);
  }
  if (V > 0) return V;
  // Backwards-Compat: wenn verbrauch_ww leer ist, nutze warmwasser-Werte
  // (alte Projekte vor der Trennung).
  return effectiveVWu(s);
}

/** Rohe WW-Jahresenergie für den VERBRAUCHS-Abzug. */
export function computeQnWWRawForVerbrauch(s){
  const V = effectiveVWuVerbrauch(s);
  if (V <= 0) return 0;
  // Verlustfaktoren ebenfalls aus verbrauch_ww — wenn nicht gesetzt,
  // Fallback auf warmwasser-Werte.
  const vw = s?.heizung?.verbrauch_ww || {};
  const ww = s?.warmwasser || {};
  const dT = num(vw.dT) || num(ww.dT) || 50;
  const fSpeicher = (vw.speicherverluste !== undefined && vw.speicherverluste !== '')
    ? num(vw.speicherverluste) : num(ww.speicherverluste);
  const fZirk = (vw.zirkulation !== undefined && vw.zirkulation !== '')
    ? num(vw.zirkulation) : num(ww.zirkulation);
  const fAusstoss = (vw.ausstoss !== undefined && vw.ausstoss !== '')
    ? num(vw.ausstoss) : num(ww.ausstoss);
  return qnwwJahr({ V_l_d: V, cp: 4.2, dT, fSpeicher, fZirk, fAusstoss });
}

/** Qn,WW für Sektion-3-Auswertungen (Qw, Speicher). 0 wenn Gate AUS. */
export function computeQnWW(s){
  if (!s?.warmwasser?.aktiv) return 0;
  return computeQnWWRaw(s);
}

/** tvoll automatisch aus Lage × Gebäudetyp. */
export function tvollAuto(s){
  const lage = TVOLL_TABLE[s?.objekt?.lage] || TVOLL_TABLE.mittelland;
  return lage[s?.objekt?.typ] || lage.efh;
}

/** Effektive tvoll mit Override-Logik. */
export function effectiveTvoll(s){
  const ov = num(s?.heizung?.tvollOverride);
  return ov > 0 ? ov : tvollAuto(s);
}

function sanierungAnteil(s, m){
  const eintraege = Array.isArray(m.zeitEintraege) ? m.zeitEintraege : [];
  if (!eintraege.length){
    return Math.min(1, Math.max(0, num(m.anteilEffective)));
  }
  let totalMonths = 0, withSanTotal = 0;
  eintraege.forEach(e => {
    const p = (s?.heizung?.perioden || []).find(x => x.id === e.periodeId);
    if (!p) return;
    const months = periodMonths(p);
    if (months <= 0) return;
    const withSan = Math.min(months, Math.max(0, num(e.monateMitSan)));
    totalMonths += months;
    withSanTotal += withSan;
  });
  if (totalMonths <= 0) return 0;
  return Math.min(1, withSanTotal / totalMonths);
}

function measureFactor(s, m){
  const p = num(m.proz) / 100;
  if (p <= 0) return 1;
  const zt = m.zeitpunkt || 'zukunft';
  if (zt === 'vergangenheit'){
    const a = sanierungAnteil(s, m);
    const denom = 1 - a*p;
    return denom > 0 ? (1 - p) / denom : 1;
  }
  return 1 - p;
}

/** Qhl,korr = Qhl,roh · Π (Korrekturfaktor_i). */
export function sanFactor(s){
  let f = 1;
  (s?.heizung?.sanierungen || []).forEach(m => { f *= measureFactor(s, m); });
  return f;
}

export function measureSavingKW(s, m, Qhl_roh){
  if (!Qhl_roh) return 0;
  return Qhl_roh * (1 - measureFactor(s, m));
}

/* --- Methoden für Qhl_roh --- */

export function computeMethodVerbrauch(s){
  if (!s?.heizung?.verbrauchAktiv) return null;
  const Qn = computeQnVerbrauch(s);
  if (Qn <= 0) return null;
  const QnWW = s.heizung.verbrauchInklWW ? computeQnWWRawForVerbrauch(s) : 0;
  const QnH = Math.max(0, Qn - QnWW);
  const tv = effectiveTvoll(s);
  const Qhl_roh = qhlAusQn({ QnH, tvoll: tv });
  const spar = sanFactor(s);
  const Qhl = Qhl_roh * spar;
  return { key:'verbrauch', label:'Aus Brennstoff-Verbrauch', Qn, QnWW, QnH, tvoll:tv, Qhl_roh, sparFactor:spar, Qhl };
}

export function computeMethodBstd(s){
  if (!s?.heizung?.betriebsstundenAktiv) return null;
  const kwh = num(s.heizung.bstd_kwh);
  const std = num(s.heizung.bstd_stunden);
  const cop = num(s.heizung.bstd_cop) || 1;
  if (kwh <= 0 || std <= 0) return null;
  const QnH = kwh * cop;
  const tv = std;
  const Qhl_roh = QnH / tv;
  const spar = sanFactor(s);
  const Qhl = Qhl_roh * spar;
  return { key:'betriebsstunden', label:'Aus WP-Betriebsstunden', QnH, tvoll:tv, Qhl_roh, sparFactor:spar, Qhl };
}

export function computeMethodKwh(s){
  if (!s?.heizung?.kwhAktiv) return null;
  const QnH = num(s.heizung.kwhManual);
  if (QnH <= 0) return null;
  const tv = effectiveTvoll(s);
  const Qhl_roh = qhlAusQn({ QnH, tvoll: tv });
  const spar = sanFactor(s);
  const Qhl = Qhl_roh * spar;
  return { key:'kwh', label:'Aus kWh/a direkt', QnH, tvoll:tv, Qhl_roh, sparFactor:spar, Qhl };
}

export function computeMethodBauperiode(s){
  const bp = BAUPERIODE_KWH[s?.objekt?.bauperiode];
  const ebf = num(s?.objekt?.ebf);
  if (!bp || ebf <= 0) return null;
  const band = bp[s.objekt.typ] || bp.efh;
  const mean = (band[0] + band[1]) / 2;
  const QnH = mean * ebf;
  const tv = effectiveTvoll(s);
  const Qhl_roh = qhlAusQn({ QnH, tvoll: tv });
  const spar = sanFactor(s);
  const Qhl = Qhl_roh * spar;
  return { key:'bauperiode', label:'Aus Bauperiode (Referenz)', QnH,
           bandMin: band[0]*ebf, bandMax: band[1]*ebf, tvoll:tv,
           Qhl_roh, sparFactor:spar, Qhl, bandSpec: band };
}

/* --- Cascade-Helpers --- */

export function computeQwDetail(Qhl, s){
  const QnWW = computeQnWW(s);
  return qwDetail({ Qhl, QnWW });
}

export function computeQw(Qhl, s){
  return computeQwDetail(Qhl, s).Qw;
}

export function computeQoff(Qhl, s){
  if (!s?.zuschlaege?.sperrzeitAktiv) return 0;
  const ov = num(s.zuschlaege.toffOverride);
  const toff = ov > 0 ? ov : (TOFF_DEFAULTS[s.zuschlaege.sperrzeitTyp] || 0);
  return qoffFormel({ Qhl, toff });
}

function resolveFSto(s){
  const key = s?.speicher?.fStoPreset;
  const p = F_STO_PRESETS.find(x => x.key === key);
  return p ? p.fSto : 1.25;
}

function resolveAWTFactor(s){
  const key = s?.speicher?.awtPreset;
  const p = A_WT_PRESETS.find(x => x.key === key);
  return p ? p.faktor : 0.65;
}

export function computeVWSto(s){
  if (!s?.warmwasser?.aktiv) return 0;
  const QnWW = computeQnWW(s);
  if (QnWW <= 0) return 0;
  const QWW_Tag = QnWW / 365;
  const dT = num(s?.speicher?.dT) || 50;
  const fSto = resolveFSto(s);
  return speichervolumen({ QWW_Tag, cp: 4.2, dT, fSto });
}

// computePlausi → verschoben nach `./plausi.mjs` (S1 / AUDIT 3.8). Re-Export oben.

/** Hauptkaskade — ein State rein, Resultat-Bundle raus.
 *  Optionales `opts.phiHuelle` (kW) ersetzt das Verbrauchs-Q_hl als
 *  Auslegungsgrundlage (für Hülle/Mixed-Mode-Bericht, AUDIT 3.12).
 *  Q_w / Q_off / Q_h und spez/plausi werden dann mit phiHuelle gerechnet. */
export function compute(s, opts = {}){
  const m = {
    verbrauch:        computeMethodVerbrauch(s),
    betriebsstunden:  computeMethodBstd(s),
    kwh:              computeMethodKwh(s)
  };
  const mList = Object.values(m).filter(Boolean);
  let primary = mList[0] || null;
  let fallback = null;
  if (!primary){
    fallback = computeMethodBauperiode(s);
    if (fallback) primary = fallback;
  }
  // AUDIT 3.12 — phiHuelle-Override: wenn der Aufrufer einen Hüllen-Q_hl in kW
  // mitgibt, ersetzt er den Verbrauchs-Q_hl als Auslegungsgrundlage.
  const phiHuelleOv = Number(opts.phiHuelle);
  const usePhiHuelle = Number.isFinite(phiHuelleOv) && phiHuelleOv > 0;
  const Qhl = usePhiHuelle ? phiHuelleOv : (primary ? primary.Qhl : 0);
  const qwDet = computeQwDetail(Qhl, s);
  const Qw   = qwDet.Qw;
  const Qoff = computeQoff(Qhl, s);
  const Qas  = s?.zuschlaege?.verbundenAktiv ? num(s.zuschlaege.qas) : 0;
  const Qh   = Qhl + Qw + Qoff + Qas;
  const ebf  = num(s?.objekt?.ebf);
  const spez = ebf > 0 ? (Qhl * 1000 / ebf) : 0;
  const plausi = computePlausi(spez, s);
  const VW_Sto = computeVWSto(s);
  const QnWW = computeQnWW(s);
  const ref = computeMethodBauperiode(s);
  // Heizungs-Pufferspeicher Richtwert ~20 L/kW Qh, aufgerundet 10 L (VDI 4645).
  const VP_Sto = Qh > 0 ? Math.ceil(Qh * 20 / 10) * 10 : 0;
  // Diskrepanz zwischen Methoden
  let maxDev = 0;
  mList.forEach(x => {
    if (primary && x !== primary && primary.Qhl > 0){
      const d = Math.abs(x.Qhl - primary.Qhl) / primary.Qhl;
      if (d > maxDev) maxDev = d;
    }
  });
  const awtFactor = resolveAWTFactor(s);
  const A_WT = Qh > 0 ? Qh * awtFactor : 0;
  return {
    methods: m, methodList: mList, primary, fallback, ref,
    Qhl, Qw, qwDetail: qwDet, Qoff, Qas, Qh,
    spez, plausi, VW_Sto, VP_Sto, QnWW, maxDev, A_WT, awtFactor,
    phiHuelleUsed: usePhiHuelle
  };
}

/* ==========================================================================
   FRESH STATE (für Tests/UI)
   ========================================================================== */

/** Default-State-Skizze. Tests können diesen klonen und Felder überschreiben. */
export function freshFwsState(){
  return {
    projekt: {},
    objekt: {
      typ: 'efh', lage: 'mittelland', bauperiode: '1986-1990',
      ebf: 0, wohneinheiten: 1
    },
    heizung: {
      verbrauchAktiv: false, perioden: [], verbrauchInklWW: true,
      betriebsstundenAktiv: false, bstd_kwh: 0, bstd_stunden: 0, bstd_cop: 1,
      kwhAktiv: false, kwhManual: 0,
      tvollOverride: 0,
      sanierungen: []
    },
    warmwasser: {
      aktiv: true, modus: 'direkt',
      VW_u: 0, personen: 0, lProPerson: 40,
      speicherverluste: 10, zirkulation: 0, ausstoss: 15, dT: 50, tLadeWW: 60
    },
    zuschlaege: {
      sperrzeitAktiv: false, sperrzeitTyp: 'werktag', toffOverride: 0,
      verbundenAktiv: false, qas: 0
    },
    speicher: { dT: 50, fStoPreset: 'innen', awtPreset: 'innen-60-55' }
  };
}
