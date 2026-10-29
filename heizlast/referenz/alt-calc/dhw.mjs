// src/calc/dhw.mjs
// Warmwasser-Auslegung — FWS-Methode (Modul 3 §8) + Norm-Werte SIA 385/2.
// Quelle: reference/FWS-RECHENWEGE.md §6/§9, reference/wissensbasis-auszug.md §D.
//
// Pure Funktionen — kein DOM-/FS-Zugriff.
//
// Hauptpfade:
//   1. VW,u (Tagesvolumen) — direkt | Personen × l/(P·d) | Messung (QW,u direkt)
//   2. QW,u = V · cp · ΔT / 3600                                [kWh/d]
//   3. QWW = QW,u + Σ Verluste (Speicher, Zirkulation, Ausstoss) [kWh/d]
//   4. Qn,WW = QWW · 365                                         [kWh/a]
//   5. Qw  = Q_HL · (24/(24−td) − 1), td = QWW/Q_HL              [kW]
//   6. VW,Sto = QWW / (cp·ΔT/3600) · f_Sto                       [l]
//      gerundet markt-realistisch (50/100/250/500-L-Schritte oder 10er).

/* ==========================================================================
   KONSTANTEN
   ========================================================================== */

export const C_P = 4.2;     // kJ/(kg·K), Wasser
export const RHO_W = 1.0;   // kg/l

// Tagesbedarf pro Person — SIA 385/2 / FWS §8.1 / Wissensbasis D
export const VWU_PRESETS = [
  { key:'sparsam',  label:'Sparsam (Dusche)',     lPd: 30 },
  { key:'normal',   label:'Normal (Standard)',     lPd: 40 },
  { key:'komfort',  label:'Komfort (inkl. Bad)',  lPd: 55 },
  { key:'mfh',      label:'MFH allgemein',         lPd: 35 },
  { key:'mfh_geh',  label:'MFH gehoben',           lPd: 45 },
  { key:'buero',    label:'Bürogebäude',           lPd:  3 }
];

// Speicher-Konfiguration f_Sto (FWS §10.2)
export const F_STO_PRESETS = [
  { key:'innen',  label:'Innenliegender WT (Misch- + Kaltzone)',     fSto: 1.25 },
  { key:'aussen', label:'Aussenliegender WT (nur Mischzone)',         fSto: 1.10 },
  { key:'ohne',   label:'Keine Misch-/Kaltzone (ideale Schichtung)',  fSto: 1.00 }
];

// Verlustfaktor-Defaults (Prozent)
export const VERLUST_DEFAULTS = {
  speicher: 10,    // %
  zirk: 0,         // % (nur wenn Zirkulation vorhanden)
  ausstoss: 15     // %
};

/* ==========================================================================
   PRIMITIV-FORMELN
   ========================================================================== */

/** VW,u aus Personen × l/(P·d) oder Direkteingabe.
 *  inputs = { modus:'direkt'|'personen'|'messung', VW_u, personen, lProPerson, QW_u? } */
export function effectiveVWu(inputs = {}){
  if (inputs.modus === 'personen'){
    const p = Number(inputs.personen) || 0;
    const l = Number(inputs.lProPerson) || 40;
    return p * l;
  }
  if (inputs.modus === 'messung') return 0; // QW,u wird direkt geliefert
  return Number(inputs.VW_u) || 0;
}

/** QW,u Tages-Nutzwärmebedarf [kWh/d]. */
export function qwuTag({ V_l_d, cp = C_P, dT = 50 }){
  return ((Number(V_l_d) || 0) * cp * (Number(dT) || 0)) / 3600;
}

/** QWW [kWh/d] = QW,u · Π(1 + f_i). */
export function qwwTag({ QW_u, fSpeicher = 0, fZirk = 0, fAusstoss = 0 }){
  return (Number(QW_u) || 0)
       * (1 + (Number(fSpeicher) || 0)/100)
       * (1 + (Number(fZirk) || 0)/100)
       * (1 + (Number(fAusstoss) || 0)/100);
}

/** Qn,WW Jahres-Kompaktformel (FWS §8). */
export function qnwwJahr({ V_l_d, cp = C_P, dT = 50, fSpeicher = 0, fZirk = 0, fAusstoss = 0 }){
  if (!(V_l_d > 0)) return 0;
  const base = V_l_d * cp * dT / 3600 * 365;
  const factor = (1 + fSpeicher/100) * (1 + fZirk/100) * (1 + fAusstoss/100);
  return base * factor;
}

/** Qw — WP-Leistungszuschlag für WW. td auf [0,12] geclampt. */
export function qw({ Qhl, QWW_Tag }){
  if (!(Qhl > 0) || !(QWW_Tag > 0)) return { Qw: 0, td: 0, tdRaw: 0, tdClamped: false };
  const tdRaw = QWW_Tag / Qhl;
  const td = Math.max(0, Math.min(12, tdRaw));
  return {
    Qw: Qhl * (24/(24 - td) - 1),
    td, tdRaw, tdClamped: tdRaw > 12
  };
}

/** VW,Sto-Roh: V = QWW_Tag / (cp·ΔT/3600). */
export function vwStoRoh({ QWW_Tag, cp = C_P, dT = 50 }){
  if (!(QWW_Tag > 0) || !(dT > 0)) return 0;
  return QWW_Tag / (cp * dT / 3600);
}

/** Marktrealistische Speichervolumen-Staffelung (AUFRUNDEN).
 *  ≤ 200 L → 50er, 200..500 L → 100er, 500..1000 L → 250er, > 1000 L → 500er. */
export function rundeSpeicherMarkt(V){
  if (!(V > 0)) return 0;
  if (V <= 200) return Math.ceil(V / 50)  * 50;
  if (V <= 500) return Math.ceil(V / 100) * 100;
  if (V <= 1000) return Math.ceil(V / 250) * 250;
  return Math.ceil(V / 500) * 500;
}

/** Heizpuffer-Staffelung (Variante mit feinerer Auflösung): ≤ 200 L → 50er, ≤ 500 L → 100er, sonst 200er. */
export function rundePufferMarkt(V){
  if (!(V > 0)) return 0;
  if (V <= 200) return Math.ceil(V / 50)  * 50;
  if (V <= 500) return Math.ceil(V / 100) * 100;
  return Math.ceil(V / 200) * 200;
}

/** Speichervolumen mit f_Sto-Aufschlag, gerundet 10-L-Schritte (FWS-Default). */
export function speichervolumen({ QWW_Tag, cp = C_P, dT = 50, fSto = 1.0 }){
  const V = vwStoRoh({ QWW_Tag, cp, dT });
  if (V <= 0) return 0;
  return Math.ceil(V * fSto / 10) * 10;
}

/* ==========================================================================
   S5 — SICHERHEITSVENTIL & EXPANSIONSGEFÄSS
   ========================================================================== */

/** Sicherheitsventil-Empfehlung nach DIN EN 12828 / SIA 384.201.
 *  Anschlussweite und Auslösedruck nach Kessel-Nennleistung Q_h [kW].
 *  Quelle: Wissensbasis §F (TRD 721 / EN 12828, gängige CH-Praxis).
 */
export function sicherheitsventilEmpfehlung(Qh_kW){
  const Q = Number(Qh_kW) || 0;
  if (Q <= 0) return null;
  let dn, anschluss, p_ansprech;
  if (Q <= 50)       { dn = 'DN15';  anschluss = '1/2"'; p_ansprech = 3.0; }
  else if (Q <= 100) { dn = 'DN20';  anschluss = '3/4"'; p_ansprech = 3.0; }
  else if (Q <= 200) { dn = 'DN25';  anschluss = '1"';   p_ansprech = 3.0; }
  else if (Q <= 350) { dn = 'DN32';  anschluss = '1¼"';  p_ansprech = 4.0; }
  else               { dn = 'DN40';  anschluss = '1½"';  p_ansprech = 4.0; }
  return { dn, anschluss, p_ansprech_bar: p_ansprech, Qh_kW: Q };
}

/** Wasser-Ausdehnungsfaktor n in Abhängigkeit von ΔT (10/4 °C → tmax).
 *  Tabellenwerte VDI 4708 / DIN EN 12828, gerundet:
 *    ΔT 50K → n ≈ 0.0143    ΔT 70K → n ≈ 0.0226    ΔT 90K → n ≈ 0.0344
 *  Linear interpoliert; clampt zwischen 30 und 100 K. */
export function ausdehnungsfaktor(deltaT_K){
  const dT = Math.max(30, Math.min(100, Number(deltaT_K) || 0));
  // Stützpunkte aus Wasser-Dichtetabelle (Mittel zwischen 10°C und tmax):
  const PTS = [
    [30, 0.0061], [40, 0.0096], [50, 0.0143], [60, 0.0181],
    [70, 0.0226], [80, 0.0284], [90, 0.0344], [100, 0.0408]
  ];
  for (let i = 0; i < PTS.length - 1; i++){
    const [t1, n1] = PTS[i], [t2, n2] = PTS[i + 1];
    if (dT >= t1 && dT <= t2){
      const k = (dT - t1) / (t2 - t1);
      return n1 + k * (n2 - n1);
    }
  }
  return PTS[PTS.length - 1][1];
}

/** Schätzung Anlagenvolumen wenn nicht explizit angegeben.
 *  Faustformel CH-EFH: 12 L/kW Heizleistung Rohrnetz + Speicher/Puffer addieren.
 *  V_Anlage = 12 · Qh_kW + V_Puffer + V_WW_Speicher (wenn im Heizkreis).
 */
export function anlagenvolumenSchaetzung({ Qh_kW = 0, V_puffer = 0, V_speicherWW_im_HK = 0 } = {}){
  return 12 * (Number(Qh_kW) || 0) + (Number(V_puffer) || 0) + (Number(V_speicherWW_im_HK) || 0);
}

/** Membran-Ausdehnungsgefäss (MAG) Nennvolumen nach DIN EN 12828:
 *    V_n = (V_a · n + V_v) · (p_e + 1) / (p_e − p_0)
 *  V_a = Anlagenvolumen [L], V_v = Wasservorlage = max(3 L, 0.5 % · V_a),
 *  p_e = Enddruck [bar], p_0 = Vordruck [bar].
 *  Gerundet auf marktrealistische Stufen 8/12/18/25/35/50/80/100/140/200/250 L.
 */
export const MAG_STUFEN = [8, 12, 18, 25, 35, 50, 80, 100, 140, 200, 250, 300, 400, 500];

export function magVolumen({ V_a, deltaT_K = 70, p_e = 2.5, p_0 = 1.0 } = {}){
  const Va = Number(V_a) || 0;
  if (!(Va > 0)) return { V_n: 0, V_n_markt: 0, V_v: 0, n: 0, hinweis: 'Anlagenvolumen fehlt' };
  const n = ausdehnungsfaktor(deltaT_K);
  const V_v = Math.max(3, 0.005 * Va); // mind. 3 L oder 0.5 %
  const pE = Number(p_e), p0 = Number(p_0);
  const denom = (pE - p0);
  if (!(denom > 0)) return { V_n: 0, V_n_markt: 0, V_v, n, hinweis: 'p_e muss > p_0 sein' };
  const V_n = (Va * n + V_v) * (pE + 1) / denom;
  // Aufrunden auf nächste Marktstufe
  const stufe = MAG_STUFEN.find(s => s >= V_n) || (Math.ceil(V_n / 50) * 50);
  return { V_n, V_n_markt: stufe, V_v, n, hinweis: 'OK' };
}

/* ==========================================================================
   CASCADE
   ========================================================================== */

/** Eingabe: Datenstruktur ww + Qhl; Ausgabe komplettes WW-Resultat. */
export function computeDhw({
  modus = 'direkt', VW_u = 0, personen = 0, lProPerson = 40, QW_u_messung = 0,
  cp = C_P, dT = 50,
  fSpeicher = VERLUST_DEFAULTS.speicher,
  fZirk = VERLUST_DEFAULTS.zirk,
  fAusstoss = VERLUST_DEFAULTS.ausstoss,
  Qhl = 0,
  fSto = 1.0
} = {}){
  const V_l_d = effectiveVWu({ modus, VW_u, personen, lProPerson });

  let QW_u;
  if (modus === 'messung'){
    QW_u = Number(QW_u_messung) || 0;
  } else {
    QW_u = qwuTag({ V_l_d, cp, dT });
  }

  const QWW_Tag = qwwTag({ QW_u, fSpeicher, fZirk, fAusstoss });
  const Qn_WW = QWW_Tag * 365;
  const qwOut = qw({ Qhl, QWW_Tag });
  const V_Sto_roh = vwStoRoh({ QWW_Tag, cp, dT });
  const V_Sto = speichervolumen({ QWW_Tag, cp, dT, fSto });
  const V_Sto_markt = rundeSpeicherMarkt(V_Sto_roh * fSto);

  return {
    V_l_d, QW_u, QWW_Tag, Qn_WW,
    Qw: qwOut.Qw, td: qwOut.td, tdRaw: qwOut.tdRaw, tdClamped: qwOut.tdClamped,
    V_Sto_roh, V_Sto, V_Sto_markt
  };
}
