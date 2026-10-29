// src/calc/heatload.mjs
// Norm-Heizlast nach SIA 384/1:2022 (Anwendung von DIN EN 12831-1:2017 in CH).
// Quelle: reference/wissensbasis-auszug.md §C, reference/referenzhaus-*.json.
//
// Pure Funktionen — keine DOM-/FS-Zugriffe.
// Eingabe: Raum-/Gebäude-Datenstrukturen, Konstanten injiziert.
// Ausgabe: { phiT, phiV, phiHL, phiRH, phiAuslg } pro Raum,
//          plus Gebäudesumme.
//
// Cascade pro Raum:
//   1. HT      = Σ(Uc · A · fRT) + ΔU_WB · A_um         [W/K]
//                (Uc = U + ΔU_WB, fRT je Anschluss)
//   2. V_inf   = 2 · V · n50 · e · ε                    [m³/h]
//      V_min   = V · n_min                              [m³/h]
//      V̇       = max(V_inf, V_min)                      [m³/h]
//   3. HV      = 0.34 · V̇                               [W/K]
//   4. Φ_T     = HT · (θint - θe)                        [W]
//      Φ_V     = HV · (θint - θe)                        [W]
//      Φ_HL    = Φ_T + Φ_V                               [W]
//   5. Φ_RH    = A · f_RH                                [W]   (nur bei Nachtabsenkung)
//   6. Φ_Auslg = (Φ_HL + Φ_RH) · fx                      [W]

/* ==========================================================================
   PRIMITIV-FORMELN
   ========================================================================== */

/** ht-Beitrag eines Bauteils: ht = (U + ΔU_WB) · A · fRT. */
export function htBauteil({ u, deltaUWb = 0, A, fRT = 1.0 }){
  const uc = (Number(u) || 0) + (Number(deltaUWb) || 0);
  return uc * (Number(A) || 0) * (Number(fRT) || 0);
}

/** Σ HT eines Raumes über alle Bauteile. */
export function sumHT(bauteile){
  if (!Array.isArray(bauteile)) return 0;
  return bauteile.reduce((s, b) => s + htBauteil(b), 0);
}

/** Lüftungsformeln. */
export function vInf({ V, n50, e_wind, epsilon = 1.0 }){
  return 2 * (Number(V)||0) * (Number(n50)||0) * (Number(e_wind)||0) * (Number(epsilon)||0);
}
export function vMin({ V, n_min }){ return (Number(V)||0) * (Number(n_min)||0); }
export function vTherm({ V_inf, V_min }){ return Math.max(Number(V_inf)||0, Number(V_min)||0); }
export function hVRaum(V_dot){ return 0.34 * (Number(V_dot)||0); } // c_p,Luft = 0.34 Wh/(m³·K)

/** fRT-Faktor für Anschluss-Typ ("aussenluft" | "erdreich" | "unbeheizt" | "beheizt"). */
export function fRT_fromAnschluss({ anschluss, theta_int, theta_nb, theta_e, b_u, fg }){
  switch (anschluss){
    case 'aussenluft': return 1.0;
    case 'erdreich':   return Number(fg) || 0.5;          // Default fg2 ≈ 0.5
    case 'unbeheizt':  return Number(b_u) || 0.45;        // Default Wissensbasis
    case 'beheizt': {
      const dt = (Number(theta_int) - Number(theta_e));
      if (!Number.isFinite(dt) || dt === 0) return 0;
      return ((Number(theta_int) || 0) - (Number(theta_nb) || 0)) / dt;
    }
    default: return 1.0;
  }
}

/* ==========================================================================
   RAUM-CASCADE
   ========================================================================== */

/** Berechnet Φ_HL für einen Raum gemäss EN 12831-1.
 *  bauteile [{ u, deltaUWb, A, fRT }, ...]
 *  geometrie { A, V } (siehe envelope.raumVolumen / .raumFlaeche)
 *  klima { theta_e } in °C
 *  raumOpt { theta_int, n_min, n50, e_wind, epsilon, A_umfassung, deltaU_WB_pauschal,
 *            f_RH_W_pro_m2, f_x }
 */
export function computeRoomHeatload({
  bauteile = [], geometrie = {}, klima = {}, raumOpt = {}
} = {}){
  const A = Number(geometrie.A) || 0;
  const V = Number(geometrie.V) || (A * (Number(geometrie.h) || 0));
  const theta_int = Number(raumOpt.theta_int);
  const theta_e   = Number(klima.theta_e);
  const dT = (Number.isFinite(theta_int) && Number.isFinite(theta_e)) ? (theta_int - theta_e) : 0;

  // 1) HT pro Bauteil + ggf. pauschaler ΔU_WB-Zuschlag auf A_umfassung
  const HT_bauteile = sumHT(bauteile);
  const A_um = Number(raumOpt.A_umfassung) || 0;
  const deltaU_pausch = Number(raumOpt.deltaU_WB_pauschal) || 0;
  const HT = HT_bauteile + deltaU_pausch * A_um;

  // 2) Lüftung
  const V_inf  = vInf({ V, n50: raumOpt.n50, e_wind: raumOpt.e_wind, epsilon: raumOpt.epsilon ?? 1.0 });
  const V_minR = vMin({ V, n_min: raumOpt.n_min });
  const V_dot  = vTherm({ V_inf, V_min: V_minR });
  const HV = hVRaum(V_dot);

  // 3) Φ_T, Φ_V, Φ_HL
  const phiT = HT * dT;
  const phiV = HV * dT;
  const phiHL = phiT + phiV;

  // 4) Wiederaufheiz-Zuschlag Φ_RH = A · f_RH
  const f_RH = Number(raumOpt.f_RH_W_pro_m2) || 0;
  const phiRH = A * f_RH;

  // 5) Auslegungsleistung (Standard fx=1.0; Sanierungs-/Unsicherheits-Aufschläge optional)
  const fx = Number(raumOpt.f_x) || 1.0;
  const phiAuslg = (phiHL + phiRH) * fx;

  return { HT, HV, V_inf, V_min: V_minR, V_dot, dT, phiT, phiV, phiHL, phiRH, phiAuslg };
}

/* ==========================================================================
   GEBÄUDE-AGGREGATION
   ========================================================================== */

/** Aggregiert eine Liste Raum-Resultate (Output von computeRoomHeatload).
 *  Liefert Σ phiHL, Σ phiRH, Σ phiAuslg, Anzahl Räume. */
export function aggregateBuilding(roomResults){
  if (!Array.isArray(roomResults) || roomResults.length === 0){
    return { phiHL: 0, phiRH: 0, phiAuslg: 0, n: 0 };
  }
  let phiHL = 0, phiRH = 0, phiAuslg = 0;
  for (const r of roomResults){
    phiHL    += Number(r?.phiHL)    || 0;
    phiRH    += Number(r?.phiRH)    || 0;
    phiAuslg += Number(r?.phiAuslg) || 0;
  }
  return { phiHL, phiRH, phiAuslg, n: roomResults.length };
}

/* ==========================================================================
   VEREINFACHTES VERFAHREN (Schnell-Schätzung Φ' [W/m²], B1 LF07 S.443)
   ========================================================================== */

/** Φ_HL_geb ≈ Φ' · A_N. */
export function phiVereinfacht({ phiSpez, A_N }){
  return (Number(phiSpez) || 0) * (Number(A_N) || 0);
}

export const PHI_SPEZ_BAND = {
  'unsaniert_vor1975':       [130, 180],
  '1976_1994':               [70, 100],
  '1995_2001_WSVO':          [60, 90],
  'EnEV2009_GEGsaniert':     [30, 50],
  'Niedrigenergie':          [25, 40],
  'Passivhaus_MinergieP':    [10, 15]
};

/* ==========================================================================
   S4 — DETAIL-MODUS: BUILDING-LOAD AUS STATE
   ==========================================================================
   computeBuildingDetailLoad(state) — Misch-Logik:
   - Wenn Räume erfasst → raumweise computeRoomHeatload pro Raum
   - Restfläche (EBF − Σ Raum.A) → pauschal mit Global-U-Werten gerechnet,
     wenn state.detail.misch.rest_global = true
   - phiHL_total = Σ raumweise + phi_rest_pauschal
   - Skelett-Defaults: theta_int=20°C (Raum kann überschreiben), n_min=0.5,
     theta_e = state.objekt.tAussenAuslegung.
   ========================================================================== */

/** Synthetisiert pauschal-Anteil für Restfläche A_rest mit Global-U-Werten.
 *  Vereinfacht: 1 m² Wand + 0.15 m² Fenster + 1/n_geschosse Dach/Boden je m² Restfläche,
 *  Volumen = A_rest * h, Lüftung n_min = 0.5.
 *  uHuelle = { wand, fenster, dach, boden, tueren } (Zahlen).
 */
export function computePauschalRest({
  A_rest, h, n_geschosse = 2, uHuelle = {},
  theta_int = 20, theta_e = -8,
  n_min = 0.5,
  // AUDIT 3.4 — Lüftungs-Infiltration nach EN 12831:
  //   V_inf = 2 · V · n50 · e_wind · ε ; V_dot = max(V_inf, V_min)
  //   Defaults für Bestand: n50 = 4 (mässig dicht), e_wind = 0.02, ε = 1.0.
  n50 = 4, e_wind = 0.02, epsilon = 1.0
}){
  const A = Number(A_rest) || 0;
  if (A <= 0) return { phiHL: 0, HT: 0, HV: 0, V: 0, V_inf: 0, V_min: 0, V_dot: 0, dT: 0 };
  const hh = Number(h) || 2.5;
  const ng = Math.max(1, Number(n_geschosse) || 1);
  const dT = (Number(theta_int) || 20) - (Number(theta_e) || -8);
  const V  = A * hh;
  const u_w = Number(uHuelle.wand) || 0;
  const u_f = Number(uHuelle.fenster) || 0;
  const u_d = Number(uHuelle.dach) || 0;
  const u_b = Number(uHuelle.boden) || 0;
  // Bauteilflächen-Schätzung pro m² Restfläche (typisch CH-Wohnbau)
  const A_w = A * 1.0;          // Aussenwand-Anteil
  const A_f = A * 0.15;         // Fensteranteil 15%
  const A_d = A / ng;           // Dachfläche-Anteil
  const A_b = A / ng;           // Bodenfläche-Anteil
  const HT = u_w * A_w + u_f * A_f + u_d * A_d + u_b * A_b * 0.5; // Boden mit fRT≈0.5 (Erdreich)
  // Lüftung: V_inf vs V_min — der grössere Anteil dominiert.
  const V_inf = 2 * V * (Number(n50) || 0) * (Number(e_wind) || 0) * (Number(epsilon) || 1);
  const V_min = V * (Number(n_min) || 0.5);
  const V_dot = Math.max(V_inf, V_min);
  const HV = 0.34 * V_dot;
  const phiHL = (HT + HV) * dT;
  return { phiHL, HT, HV, V, V_inf, V_min, V_dot, dT };
}

/** Hauptfunktion S4: Detail-Heizlast aus state.
 *  Erwartet state mit objekt.{ebf, geschosshoehe, tAussenAuslegung} und
 *  detail.{huelle, raeume, misch}.
 *  uHuelleResolved = { wand, fenster, dach, boden, tueren } — bereits aufgelöste Zahlen.
 */
export function computeBuildingDetailLoad(state, uHuelleResolved = {}){
  const det = state?.detail || {};
  if (!det.aktiv) return null;
  const obj = state?.objekt || {};
  const theta_e = Number(obj.tAussenAuslegung);
  const ebf = Number(obj.ebf) || 0;
  const h = Number(obj.geschosshoehe) || 2.5;
  const n_geschosse = Number(obj.anzahl_geschosse) || (obj.typ === 'mfh' ? 4 : 2);

  // Raumweise
  const raeume = Array.isArray(det.raeume) ? det.raeume : [];
  const roomResults = [];
  let A_raeume = 0;
  for (const r of raeume){
    if (!r) continue;
    const A = Number(r.A) || (Number(r.l) > 0 && Number(r.b) > 0 ? Number(r.l) * Number(r.b) : 0);
    const hr = Number(r.h) || h;
    const beheizt = r.beheizt !== false; // Default true
    A_raeume += A;
    if (!beheizt){
      // Raum unbeheizt → kein Heizlast-Anteil, aber A trotzdem von Restfläche abziehen
      roomResults.push({ name: r.name || '–', A, beheizt: false, phiHL: 0, phiRH: 0, phiAuslg: 0 });
      continue;
    }
    // Bauteile aus r.bauteile (Auswahl referenziert Hülle)
    const bauteile = (r.bauteile || []).map(b => {
      const u_default = Number(uHuelleResolved[b.typ]) || 0;
      const u = (b.u != null && b.u !== '') ? Number(b.u) : u_default;
      return {
        u, deltaUWb: Number(b.deltaUWb) || 0,
        A: Number(b.A) || 0,
        fRT: (b.fRT != null && b.fRT !== '') ? Number(b.fRT) : 1.0
      };
    });
    const res = computeRoomHeatload({
      bauteile,
      geometrie: { A, h: hr, V: A * hr },
      klima: { theta_e },
      raumOpt: {
        theta_int: Number(r.theta_int) || 20,
        n_min: Number(r.n_min) || 0.5,
        n50: Number(r.n50) || 4,
        e_wind: Number(r.e_wind) || 0.02,
        epsilon: 1.0,
        f_RH_W_pro_m2: Number(r.f_RH) || 0,
        f_x: 1.0
      }
    });
    roomResults.push(Object.assign({ name: r.name || ('Raum ' + (roomResults.length+1)), A, beheizt: true }, res));
  }
  const phi_raeume = roomResults.reduce((s, r) => s + (Number(r.phiHL) || 0), 0);

  const A_rest = Math.max(0, ebf - A_raeume);
  let phi_rest = 0;
  let restDetail = null;
  if (det.misch && det.misch.rest_global !== false && A_rest > 0){
    // AUDIT 3.4: n50/e_wind aus state.objekt (oder Mittelwert über Räume)
    //  als Default für Pauschal-Rest. Falls nicht gesetzt, EN 12831 Bestand-
    //  Default 4 / 0.02 (siehe computePauschalRest).
    const n50_eff = Number(obj.n50) || 4;
    const e_wind_eff = Number(obj.e_wind) || 0.02;
    restDetail = computePauschalRest({
      A_rest, h, n_geschosse, uHuelle: uHuelleResolved,
      theta_int: 20, theta_e,
      n50: n50_eff, e_wind: e_wind_eff
    });
    phi_rest = restDetail.phiHL;
  }
  const phiHL_total = phi_raeume + phi_rest;
  return {
    phiHL_total, phi_raeume, phi_rest, A_raeume, A_rest,
    roomResults, restDetail,
    Qhl_kW: phiHL_total / 1000
  };
}
