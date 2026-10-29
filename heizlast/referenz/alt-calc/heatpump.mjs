// src/calc/heatpump.mjs
// WP-Auswahl, Bivalenzpunkt, JAZ-Schätzung.
// Quelle: FWS-RECHENWEGE.md §16/§18, data/waermepumpen.json (CH-Markt-DB).
//
// Pure Funktionen — kein DOM-/FS-Zugriff.

/* ==========================================================================
   FILTER
   ========================================================================== */

/** Liest die Heizleistung am A-7/W35-Norm-Punkt aus einem WP-Datensatz.
 *  Akzeptiert sowohl waermepumpen.json (CH-Markt) als auch produkte.json (powerCurve). */
export function nennleistungA7W35(wp){
  if (!wp) return 0;
  // CH-Markt-DB-Format
  const v = wp['Heizleistung A-7/W35 [kW]'];
  if (Number.isFinite(Number(v))) return Number(v);
  // produkte.json-Format (powerCurve)
  if (Array.isArray(wp.powerCurve)){
    const pt = wp.powerCurve.find(p => Number(p.tSource) === -7 && Number(p.tSink) === 35);
    if (pt) return Number(pt.qWp) || 0;
  }
  return 0;
}

/** Max. Vorlauftemperatur. */
export function maxVorlauf(wp){
  if (!wp) return 0;
  const v = wp['Vorlauf max. [°C]'];
  if (Number.isFinite(Number(v))) return Number(v);
  if (Number.isFinite(Number(wp.maxFlowTemp))) return Number(wp.maxFlowTemp);
  return 0;
}

/** Aufstellung: 'Aussen' | 'Innen' | undefined. */
export function aufstellung(wp){
  if (!wp) return null;
  return wp.Aufstellung || null;
}

/** Schalldruck Tag [dB(A)]. */
export function schallTag(wp){
  if (!wp) return null;
  const v = wp['Schall Tag max [dB(A)]'];
  if (Number.isFinite(Number(v))) return Number(v);
  if (Number.isFinite(Number(wp.soundPowerDay))) return Number(wp.soundPowerDay);
  return null;
}

/** COP A2/W35 (oder fallback A-7/W35). */
export function copA2W35(wp){
  if (!wp) return null;
  const v = wp['COP A2/W35'];
  if (Number.isFinite(Number(v))) return Number(v);
  if (Array.isArray(wp.powerCurve)){
    const pt = wp.powerCurve.find(p => Number(p.tSource) === 2 && Number(p.tSink) === 35);
    if (pt) return Number(pt.cop) || null;
  }
  return null;
}

export function copAm7W35(wp){
  if (!wp) return null;
  const v = wp['COP A-7/W35'];
  if (Number.isFinite(Number(v))) return Number(v);
  if (Array.isArray(wp.powerCurve)){
    const pt = wp.powerCurve.find(p => Number(p.tSource) === -7 && Number(p.tSink) === 35);
    if (pt) return Number(pt.cop) || null;
  }
  return null;
}

/** Filtert WP-Datenbank nach Kriterien.
 *  @param {Array} db                  hauptgeraete[] aus waermepumpen.json
 *  @param {object} kriterien
 *  @param {number} kriterien.Qh_kw    Auslegungsleistung [kW]
 *  @param {number} kriterien.toleranz_proz  Toleranz nach oben/unten [%], z.B. 20
 *  @param {number} [kriterien.tVL_max]      Max. Vorlauftemperatur Heizung [°C]
 *  @param {string} [kriterien.aufstellung]  'Aussen' | 'Innen' | 'alle'
 *  @param {number} [kriterien.schallklasse_max]  Max. Schalldruck Tag [dB(A)]
 *  @returns {Array} gefilterte WP-Liste, sortiert nach Passung (kleinster Q-Diff zuerst)
 */
export function filterWaermepumpen(db, kriterien = {}){
  const list = Array.isArray(db) ? db : [];
  const Qh = Number(kriterien.Qh_kw) || 0;
  const tol = (Number(kriterien.toleranz_proz) || 20) / 100;
  const tVL = Number(kriterien.tVL_max) || 0;
  const auf = kriterien.aufstellung && kriterien.aufstellung !== 'alle' ? kriterien.aufstellung : null;
  const schall = Number(kriterien.schallklasse_max) || 0;

  const filtered = list.filter(wp => {
    const Q = nennleistungA7W35(wp);
    if (Qh > 0){
      // Akzeptanz: Q im Bereich [Qh*0.85, Qh*(1 + tol)] — leichte Untertoleranz
      // wegen Bivalenz-Reserve, harte Obergrenze um Übergrösse zu vermeiden.
      const Qmin = Qh * (1 - tol);
      const Qmax = Qh * (1 + tol);
      if (Q < Qmin || Q > Qmax) return false;
    }
    if (tVL > 0){
      const m = maxVorlauf(wp);
      if (m > 0 && m < tVL) return false;
    }
    if (auf){
      const a = aufstellung(wp);
      if (a && a !== auf) return false;
    }
    if (schall > 0){
      const sd = schallTag(wp);
      if (sd != null && sd > schall) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const da = Math.abs(nennleistungA7W35(a) - Qh);
    const db_ = Math.abs(nennleistungA7W35(b) - Qh);
    return da - db_;
  });
  return filtered;
}

/* ==========================================================================
   BIVALENZPUNKT
   ========================================================================== */

/** Lineare Interpolation einer Power-Curve über die Aussentemperatur.
 *  Erwartet kennlinie = [{ T_aussen, Qh_wp, COP }] (sortiert oder unsortiert).
 */
export function interpolatePowerCurve(kennlinie, T){
  const arr = (kennlinie || []).slice().sort((a, b) => a.T_aussen - b.T_aussen);
  if (arr.length === 0) return null;
  if (T <= arr[0].T_aussen) return Object.assign({}, arr[0]);
  if (T >= arr[arr.length - 1].T_aussen) return Object.assign({}, arr[arr.length - 1]);
  for (let i = 0; i < arr.length - 1; i++){
    if (T >= arr[i].T_aussen && T <= arr[i + 1].T_aussen){
      const k = (T - arr[i].T_aussen) / (arr[i + 1].T_aussen - arr[i].T_aussen);
      return {
        T_aussen: T,
        Qh_wp: arr[i].Qh_wp + k * (arr[i + 1].Qh_wp - arr[i].Qh_wp),
        COP:    arr[i].COP    + k * (arr[i + 1].COP    - arr[i].COP)
      };
    }
  }
  return Object.assign({}, arr[arr.length - 1]);
}

/** Bivalenzpunkt-Berechnung (FWS §18).
 *  Heizlast-Linie: Q_HL(T) = Qh · (T_HG − T) / (T_HG − T_N), T ≤ T_HG.
 *  WP-Linie: aus kennlinie linear interpoliert.
 *  Bivalenz: kleinste T, ab der Q_WP < Q_HL (WP deckt nicht mehr alleine).
 */
export function bivalenzpunkt({ Qh_geb, kennlinie = [], T_N = -8, T_HG = 15 } = {}){
  const Qh = Number(Qh_geb) || 0;
  if (!(Qh > 0) || !Array.isArray(kennlinie) || kennlinie.length < 2 || !(T_HG > T_N)){
    return { T_biv: null, Qh_biv: 0, deckungEnergie: 0 };
  }
  const Qload = (T) => Qh * (T_HG - T) / (T_HG - T_N);
  // Diskrete Suche von T_N nach T_HG
  let T_biv = null, Q_biv = 0;
  const step = 0.5;
  for (let T = T_N; T <= T_HG; T += step){
    const wp = interpolatePowerCurve(kennlinie, T);
    if (!wp) continue;
    const QL = Qload(T);
    if (wp.Qh_wp >= QL){
      T_biv = T;
      Q_biv = QL;
      break;
    }
  }
  // Energetische Deckungs-Schätzung (vereinfacht): Anteil der Heizenergie unterhalb T_biv,
  // den die WP allein nicht mehr deckt. Heizgradtage-basiertes Modell:
  // Energie_total ∝ ∫(T_HG−T)dT von T_N bis T_HG, Defizit ∝ ∫(QL−Q_WP)dT von T_N bis T_biv.
  let energie_total = 0, defizit = 0;
  const dT = 0.5;
  for (let T = T_N; T <= T_HG; T += dT){
    const wp = interpolatePowerCurve(kennlinie, T);
    const QL = Qload(T);
    energie_total += QL * dT;
    if (wp && wp.Qh_wp < QL && (T_biv == null || T < T_biv)){
      defizit += (QL - wp.Qh_wp) * dT;
    }
  }
  const deckungEnergie = energie_total > 0 ? Math.max(0, 1 - defizit / energie_total) : 0;
  return { T_biv, Qh_biv: Q_biv, deckungEnergie };
}

/* ==========================================================================
   JAZ — vereinfachte Schätzung
   ========================================================================== */

/** Vereinfachte JAZ-Schätzung (Heizen + WW gemischt).
 *  Korrektur-Faustregeln (FWS §16, BAFU 2022):
 *   - COP fällt bei höherem tVL ca. linear (~ 2 % pro K oberhalb 35°C).
 *   - WW-Ladung tVL ~55-60 °C → eigener COP_WW
 *   - Quelle 'sole'/'wasser' → COP-Bonus (tiefere Quelle-T-Schwankung)
 */
export function jazSchaetzung({
  quelle = 'luft',
  tVL_heizung = 35, anteilWW = 0.15, tVL_WW = 55,
  COP_ref = 4.0, COP_WW_ref = 2.8
} = {}){
  // Korrektur tVL Heizung
  const k_tVL_heiz = 1 - 0.020 * Math.max(0, Number(tVL_heizung) - 35);
  const k_tVL_WW   = 1 - 0.020 * Math.max(0, Number(tVL_WW) - 35);
  const sourceBonus = quelle === 'sole' ? 1.20 : (quelle === 'wasser' ? 1.30 : 1.00);
  const COP_heizen = (Number(COP_ref) || 4.0) * k_tVL_heiz * sourceBonus;
  const COP_WW    = (Number(COP_WW_ref) || 2.8) * k_tVL_WW * sourceBonus;
  const aWW = Math.max(0, Math.min(1, Number(anteilWW)));
  const aH  = 1 - aWW;
  // JAZ harmonisches Mittel der Energie-Anteile
  const denom = aH / Math.max(0.5, COP_heizen) + aWW / Math.max(0.5, COP_WW);
  const JAZ = denom > 0 ? 1 / denom : 0;
  return { JAZ, COP_heizen, COP_WW };
}

/* ==========================================================================
   INVERTER-FAUSTREGEL & DECKUNGSGRAD
   ========================================================================== */

/** Inverter-Check (FWS §16.2): Q_HL / Q_WP ≥ 0.75 → grün. */
export function inverterCheck(Qh_geb, Qh_wp){
  const a = Number(Qh_geb) || 0;
  const b = Number(Qh_wp) || 0;
  if (!(a > 0) || !(b > 0)) return { ratio: 0, ampel: 'grau', hinweis: 'Werte fehlen' };
  const ratio = a / b;
  let ampel, hinweis;
  if (ratio >= 0.75 && ratio <= 1.20)      { ampel = 'gruen'; hinweis = 'Modulation gut, kein Takten'; }
  else if (ratio >= 0.60 && ratio < 0.75)  { ampel = 'gelb';  hinweis = 'WP-Übergrösse — kürzere Laufzeiten'; }
  else if (ratio > 1.20 && ratio <= 1.40)  { ampel = 'gelb';  hinweis = 'WP knapp — bei T_N evtl. Stabbeheizung nötig'; }
  else if (ratio < 0.60)                   { ampel = 'rot';   hinweis = 'WP deutlich übergrössert'; }
  else                                     { ampel = 'rot';   hinweis = 'WP zu klein — Bivalenz/Stab nötig'; }
  return { ratio, ampel, hinweis };
}

/* ==========================================================================
   STATE-INTEGRATION
   ========================================================================== */

/** Holt die ausgewählte WP (state.geraet.gewaehlt_id) aus der DB. */
export function getSelectedWp(db, geraet){
  if (!geraet || !geraet.gewaehlt_id || !Array.isArray(db)) return null;
  return db.find(wp => wp.ID === geraet.gewaehlt_id || wp._id === geraet.gewaehlt_id) || null;
}

/** Bequemer All-in-one-Compute aus state + db.
 *  state: vollständiger State, db: hauptgeraete[].
 *  Qh_kW: Auslegungsleistung (aus FWS-Cascade).
 *
 * S1 (3f) — VL-Temp-Konsolidierung: WP-Filter liest die VL aus der
 * Detail-Verteilung (`detail.verteilung.global.tVL_neu`); Fallback 55 °C
 * wenn der Detail-Modus aus ist oder das Feld leer ist. Das alte
 * `objekt.tVLMaxHeizung` bleibt im State für Backwards-Compat.
 */
export function computeHeatpumpResult(state, db, Qh_kW){
  const geraet = (state && state.geraet) || {};
  const filter = geraet.filter || {};
  const tVL_detail = Number(state?.detail?.verteilung?.global?.tVL_neu);
  const tVL = Number.isFinite(tVL_detail) && tVL_detail > 0 ? tVL_detail : 55;
  const liste = filterWaermepumpen(db, {
    Qh_kw: Qh_kW,
    toleranz_proz: filter.toleranz_proz || 20,
    tVL_max: tVL,
    aufstellung: filter.aufstellung || 'alle',
    schallklasse_max: filter.schallklasse_max || 0
  });
  const sel = getSelectedWp(db, geraet);
  let inverter = null, biv = null, jaz = null;
  if (sel){
    const Q_wp = nennleistungA7W35(sel);
    inverter = inverterCheck(Qh_kW, Q_wp);
    // Bivalenzpunkt: konstruiere kennlinie aus 2-3 Punkten
    const kenn = [];
    const qm7 = nennleistungA7W35(sel);
    const cm7 = copAm7W35(sel);
    const c2  = copA2W35(sel);
    if (qm7) kenn.push({ T_aussen: -7, Qh_wp: qm7, COP: cm7 || 2.5 });
    // Schätze Q bei +2°C: ~ +12% gegenüber A-7 (typisch)
    if (qm7) kenn.push({ T_aussen: 2, Qh_wp: qm7 * 1.12, COP: c2 || 3.5 });
    // Schätze Q bei +7°C: ~ +20% gegenüber A-7
    if (qm7) kenn.push({ T_aussen: 7, Qh_wp: qm7 * 1.20, COP: (c2 || 3.5) * 1.10 });
    if (kenn.length >= 2){
      biv = bivalenzpunkt({
        Qh_geb: Qh_kW, kennlinie: kenn,
        T_N: Number(state?.objekt?.tAussenAuslegung) || -8,
        T_HG: 15
      });
    }
    jaz = jazSchaetzung({
      quelle: 'luft',
      tVL_heizung: tVL || 35,
      anteilWW: 0.15,
      tVL_WW: Number(state?.warmwasser?.tLadeWW) || 55,
      COP_ref: c2 || 4.0,
      COP_WW_ref: c2 ? c2 * 0.7 : 2.8
    });
  }
  return { liste, sel, inverter, biv, jaz };
}
