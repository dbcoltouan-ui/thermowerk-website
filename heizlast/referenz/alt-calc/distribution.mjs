// src/calc/distribution.mjs
// Wärmeübergabe-Plausibilität (Heizflächen, Vorlauftemperaturen, Heizkreise).
// Quelle: FWS Modul 3 §11 (Wärmeübergabe), VDI 6030 (Heizkörper-Auslegung),
//         Heizflächen-Korrekturkurven Q ∝ ΔT_log^n.
//
// Pure Funktionen — kein DOM-/FS-Zugriff.
//
// Modell:
//   Q(ΔT) = Q_norm · (ΔT_log,neu / ΔT_log,norm)^n
//   ΔT_log = (ΔT1 − ΔT2) / ln(ΔT1/ΔT2),  ΔTi = tWasser − tInnen
//   n = 1.30  Heizkörper (Konvektor-/Plattenheizkörper)
//   n = 1.10  Konvektor / spez. Bauart
//   n = 1.00  Fussbodenheizung
//   n = 1.05  Wandheizung
//
// Spez. Norm-Leistung (W/m² Heizflächen-Bezugsfläche) nach Gerätetyp,
// jeweils bei Norm-Auslegung der Heizfläche:
//   FBH  bei 35/28/20  → ca.  80 W/m² (Bodenfläche)
//   Wand bei 35/28/20  → ca.  80 W/m² (Heizfläche)
//   HK   bei 75/65/20  → ca. 1000 W/m² (HK-Frontfläche)
//
// Plausi-Ampel (Sanierungs-Frage „reicht alte HF bei niedrigerem VL?"):
//   deckungsgrad ≥ 1.00 → grün
//   0.85 ≤ deckungsgrad < 1.00 → gelb
//   deckungsgrad < 0.85 → rot
//
// Heizkreis-Aggregation: Liste { kreis, raeume[], A_total, Q_total } —
// nutzt der UI für Verteiler-Übersicht.

/* ==========================================================================
   KONSTANTEN
   ========================================================================== */

export const N_EXPONENT = {
  fbh: 1.00,
  wandheizung: 1.05,
  heizkoerper: 1.30,
  konvektor: 1.10
};

/** Norm-Auslegung pro Heizflächentyp (Referenzpunkt der Korrekturkurve). */
export const REF_AUSLEGUNG = {
  fbh:         { tVL: 35, tRL: 28, tInnen: 20, q_W_pro_m2:   80 },
  wandheizung: { tVL: 35, tRL: 28, tInnen: 20, q_W_pro_m2:   80 },
  heizkoerper: { tVL: 75, tRL: 65, tInnen: 20, q_W_pro_m2: 1000 },
  konvektor:   { tVL: 75, tRL: 65, tInnen: 20, q_W_pro_m2: 1500 }
};

/* ==========================================================================
   PRIMITIV-FORMELN
   ========================================================================== */

/** Logarithmische Mitteltemperatur-Differenz Heizfläche ↔ Raum [K].
 *  Wenn dT1 ≈ dT2 → arithmetisches Mittel (Limes der ln-Formel).
 *  Liefert 0 wenn eines der dT ≤ 0 (Heizfläche kann dann nicht heizen). */
export function dTm({ tVL, tRL, tInnen = 20 } = {}){
  const a = Number(tVL) - Number(tInnen);
  const b = Number(tRL) - Number(tInnen);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  if (a <= 0 || b <= 0) return 0;
  if (Math.abs(a - b) < 0.01) return (a + b) / 2;
  return (a - b) / Math.log(a / b);
}

/** Leistungsfaktor f = (ΔT_neu / ΔT_ref)^n (relativ zur Norm-Auslegung).
 *  null wenn Heizflächentyp unbekannt oder ΔT_ref nicht berechenbar.
 *  @param {object} args
 *  @param {string} args.typ          Heizflächentyp
 *  @param {number} args.tVL          neue Vorlauftemperatur [°C]
 *  @param {number} args.tRL          neue Rücklauftemperatur [°C]
 *  @param {number} [args.tInnen=20]  Innentemperatur [°C]
 *  @param {number} [args.n_exponent] Override für den Heizflächen-Exponent
 *                                    (Phase C: aus Modell/Fallback gespiegelt
 *                                    statt Default-Tabelle pro Typ).
 */
export function leistungsFaktor({ typ, tVL, tRL, tInnen = 20, n_exponent } = {}){
  const ref = REF_AUSLEGUNG[typ];
  if (!ref) return null;
  const dT_neu = dTm({ tVL, tRL, tInnen });
  const dT_ref = dTm(ref);
  if (!(dT_ref > 0)) return null;
  if (!(dT_neu > 0)) return 0;
  const n_override = Number(n_exponent);
  const n = (Number.isFinite(n_override) && n_override > 0) ? n_override : (N_EXPONENT[typ] || 1.3);
  return Math.pow(dT_neu / dT_ref, n);
}

/** Ampel-Klassifikation aus Deckungsgrad. */
export function ampelFromDeckungsgrad(d){
  if (d == null || !Number.isFinite(d)) return 'grau';
  if (d >= 1.00) return 'gruen';
  if (d >= 0.85) return 'gelb';
  return 'rot';
}

/* ==========================================================================
   PLAUSI: REICHT BESTEHENDE HEIZFLÄCHE BEI NEUER VORLAUFTEMP?
   ========================================================================== */

/** Plausibilitäts-Check Bestand: gegeben Heizlast, Heizfläche, Typ, neue VL/RL —
 *  reicht die Heizfläche?
 *
 *  @param {object} args
 *  @param {number} args.phiHL_raum       Heizlast Raum [W]
 *  @param {number} args.A_heizflaeche    Heizfläche [m²]
 *  @param {string} args.typ              'fbh' | 'wandheizung' | 'heizkoerper' | 'konvektor'
 *  @param {number} args.tVL_neu          Geplante neue Vorlauftemperatur [°C]
 *  @param {number} [args.tRL_neu]        Geplante Rücklauftemperatur [°C] (Default: tVL−7 für FBH/Wand, tVL−10 für HK/Konv)
 *  @param {number} [args.tInnen=20]      Innentemperatur [°C]
 *  @param {number} [args.q_norm_W_pro_m2] Override für spez. Norm-Leistung
 *  @param {number} [args.n_exponent]      Override für Heizflächen-Exponent
 *                                         (Phase C: aus Modell/Fallback gespiegelt;
 *                                         z. B. n=1.40 Konvektor passiv vs. n=1.30 HK)
 *  @returns {{ ampel, deckungsgrad, faktor, Q_real, hinweis }}
 */
export function plausibilitaetHeizflaeche({
  phiHL_raum, A_heizflaeche, typ,
  tVL_neu, tRL_neu, tInnen = 20, q_norm_W_pro_m2, n_exponent
} = {}){
  const ref = REF_AUSLEGUNG[typ];
  if (!ref) return { ampel: 'grau', deckungsgrad: null, faktor: null, Q_real: 0, hinweis: 'Unbekannter Heizflächentyp' };
  const phi = Number(phiHL_raum) || 0;
  const A = Number(A_heizflaeche) || 0;
  const tVL = Number(tVL_neu);
  const dT_default = (typ === 'fbh' || typ === 'wandheizung') ? 7 : 10;
  const tRL = (tRL_neu == null || tRL_neu === '') ? (tVL - dT_default) : Number(tRL_neu);
  if (!(A > 0) || !(phi > 0)){
    return { ampel: 'grau', deckungsgrad: null, faktor: null, Q_real: 0, hinweis: 'Heizfläche oder Heizlast fehlt' };
  }
  const f = leistungsFaktor({ typ, tVL, tRL, tInnen, n_exponent });
  if (f == null){
    return { ampel: 'grau', deckungsgrad: null, faktor: null, Q_real: 0, hinweis: 'Vorlauf-/Rücklauftemperatur ungültig' };
  }
  const q_norm = Number(q_norm_W_pro_m2) || ref.q_W_pro_m2;
  const Q_real = q_norm * f * A;
  const deckungsgrad = Q_real / phi;
  const ampel = ampelFromDeckungsgrad(deckungsgrad);
  let hinweis;
  if (ampel === 'gruen') hinweis = 'Heizfläche reicht aus';
  else if (ampel === 'gelb') hinweis = 'Knapp — bei kalten Tagen evtl. Boost erforderlich';
  else hinweis = 'Heizfläche zu klein — Vergrösserung oder höhere VL nötig';
  return { ampel, deckungsgrad, faktor: f, Q_real, hinweis };
}

/* ==========================================================================
   MAX. VORLAUFTEMPERATUR BEI GEGEBENER HEIZFLÄCHE
   ========================================================================== */

/** Wieviel Vorlauftemperatur ist bei gegebener Heizfläche und Heizlast nötig?
 *  Iterative Lösung: dT_log_erforderlich = dT_ref · (Q_HL / (q_norm · A))^(1/n)
 *  Daraus über Annahme tRL = tVL − Spreizung → tVL.
 *  @returns {{ tVL_max, tRL_max, dT_log_req, dT_logSpan }} oder null bei ungültigen Inputs
 */
export function maxVorlauftemperatur({
  phiHL_raum, A_heizflaeche, typ, tInnen = 20,
  spreizung = null, q_norm_W_pro_m2, n_exponent
} = {}){
  const ref = REF_AUSLEGUNG[typ];
  if (!ref) return null;
  const phi = Number(phiHL_raum) || 0;
  const A = Number(A_heizflaeche) || 0;
  if (!(phi > 0) || !(A > 0)) return null;
  const q_norm = Number(q_norm_W_pro_m2) || ref.q_W_pro_m2;
  const n_override = Number(n_exponent);
  const n = (Number.isFinite(n_override) && n_override > 0) ? n_override : (N_EXPONENT[typ] || 1.3);
  const dT_ref = dTm(ref);
  if (!(dT_ref > 0)) return null;
  // Q = q_norm · A · (dT/dT_ref)^n  →  dT = dT_ref · (Q/(q_norm·A))^(1/n)
  const factor = phi / (q_norm * A);
  if (!(factor > 0)) return null;
  const dT_req = dT_ref * Math.pow(factor, 1 / n);
  // Annahme: arithmetisches Mittel als Approximation für Auflösung in tVL/tRL
  const span = (spreizung != null) ? Number(spreizung) : ((typ === 'fbh' || typ === 'wandheizung') ? 7 : 10);
  // dT_arith = (dTm + dTm)/2 ≈ dTm bei kleiner Spreizung — wir nehmen
  // dT_mittel ≈ dT_req als Vorlauf-Mittel-Differenz, dann tVL = tInnen + dT_req + span/2.
  const tVL_max = Number(tInnen) + dT_req + span / 2;
  const tRL_max = tVL_max - span;
  return { tVL_max, tRL_max, dT_log_req: dT_req, spreizung: span };
}

/* ==========================================================================
   HEIZKREIS-AGGREGATION
   ========================================================================== */

/** Gruppiert Heizflächen-Einträge nach Heizkreis.
 *  Eingabe: Array { raumId, raumName?, A, typ, kreis, phiHL? }
 *  @returns {Array<{kreis, raeume:[{raumId, raumName, A, typ, phiHL}], A_total, phi_total, typen}>}
 */
export function heizkreiseGruppieren(heizflaechen){
  const list = Array.isArray(heizflaechen) ? heizflaechen : [];
  const map = new Map();
  for (const h of list){
    const k = (h && h.kreis) || '–';
    if (!map.has(k)) map.set(k, { kreis: k, raeume: [], A_total: 0, phi_total: 0, typen: new Set() });
    const grp = map.get(k);
    grp.raeume.push({
      raumId: h.raumId ?? null,
      raumName: h.raumName || '',
      A: Number(h.A) || 0,
      typ: h.typ || '',
      phiHL: Number(h.phiHL) || 0
    });
    grp.A_total += Number(h.A) || 0;
    grp.phi_total += Number(h.phiHL) || 0;
    if (h.typ) grp.typen.add(h.typ);
  }
  return Array.from(map.values()).map(g => Object.assign(g, { typen: Array.from(g.typen) }));
}

/* ==========================================================================
   STATE-INTEGRATION (S5)
   ========================================================================== */

/** Berechnet Plausi pro Raum-Heizfläche aus state + Detail-Heatload-Result.
 *  Liefert ein Bundle mit:
 *    - heizflaechen_flat: alle Heizflächen flach mit Plausi-Resultaten
 *    - kreise: gruppiert nach Heizkreis
 *    - global: Plausi für Global-Fallback (wenn keine Räume erfasst)
 *  detailLoad = computeBuildingDetailLoad-Ergebnis (kann null sein).
 */
export function computeDistribution(state, detailLoad){
  if (!state || !state.detail) return null;
  const det = state.detail;
  const vert = det.verteilung || {};
  const raeume = Array.isArray(det.raeume) ? det.raeume : [];
  const tInnen_default = 20;
  const flat = [];
  const roomResults = (detailLoad && detailLoad.roomResults) || [];

  for (let i = 0; i < raeume.length; i++){
    const r = raeume[i];
    if (!r) continue;
    const tInnen = Number(r.theta_int) || tInnen_default;
    const rRes = roomResults[i] || null;
    const phiHL_raum = (rRes && Number.isFinite(rRes.phiHL)) ? rRes.phiHL : 0;
    const heizflaechen = Array.isArray(r.heizflaechen) ? r.heizflaechen : [];
    if (heizflaechen.length === 0) continue;
    // Phase C: Gewichte = q_norm (W absolut) wenn aus Stammdaten vorhanden,
    // sonst Default (REF_AUSLEGUNG.q_W_pro_m2 × A). Räume mit gemischten
    // Heizflächen (Picker + Pauschal) werden so korrekt nach realer
    // Norm-Leistung gewichtet.
    const gewichte = heizflaechen.map(h => {
      const A = Number(h.A) || 0;
      if (Number(h.q_norm) > 0) return Number(h.q_norm); // q_norm = W absolut
      const ref = REF_AUSLEGUNG[h.typ];
      return ref ? ref.q_W_pro_m2 * A : 0;
    });
    const sumG = gewichte.reduce((s, g) => s + g, 0);
    const tVL_neu = (vert.global && Number(vert.global.tVL_neu)) || 35;
    const tRL_neu = (vert.global && Number(vert.global.tRL_neu)) || (tVL_neu - 7);
    for (let j = 0; j < heizflaechen.length; j++){
      const h = heizflaechen[j];
      const phi_anteil = sumG > 0
        ? phiHL_raum * (gewichte[j] / sumG)
        : (phiHL_raum / heizflaechen.length);
      // Phase C: q_norm/n_exponent aus dem State ziehen — Stammdaten-Genauigkeit.
      const A_hf = Number(h.A) || 0;
      const q_norm_W_pro_m2 = (Number(h.q_norm) > 0 && A_hf > 0) ? (h.q_norm / A_hf) : undefined;
      const n_exp = (Number(h.n_exponent) > 0) ? Number(h.n_exponent) : undefined;
      const plausi = plausibilitaetHeizflaeche({
        phiHL_raum: phi_anteil,
        A_heizflaeche: A_hf,
        typ: h.typ,
        tVL_neu, tRL_neu, tInnen,
        q_norm_W_pro_m2, n_exponent: n_exp
      });
      const tVL_req = maxVorlauftemperatur({
        phiHL_raum: phi_anteil,
        A_heizflaeche: A_hf,
        typ: h.typ, tInnen,
        q_norm_W_pro_m2, n_exponent: n_exp
      });
      flat.push({
        raumIdx: i, raumName: r.name || ('Raum ' + (i + 1)),
        bauteilIdx: j, typ: h.typ, A: A_hf, kreis: h.kreis_id || '–',
        modell: h.modell || '',
        q_norm: Number(h.q_norm) || 0,
        n_exponent: n_exp || null,
        phiHL: phi_anteil, plausi,
        tVL_max: tVL_req ? tVL_req.tVL_max : null,
        tRL_max: tVL_req ? tVL_req.tRL_max : null
      });
    }
  }

  const kreise = heizkreiseGruppieren(flat.map(f => ({
    raumId: f.raumIdx, raumName: f.raumName, A: f.A, typ: f.typ, kreis: f.kreis,
    phiHL: f.phiHL
  })));

  // Global-Plausi: nur wenn keine Räume erfasst sind
  let global = null;
  if (raeume.length === 0 && detailLoad && detailLoad.phiHL_total > 0){
    const g = vert.global || {};
    const tVL = Number(g.tVL_neu) || 35;
    const tRL = Number(g.tRL_neu) || (tVL - 7);
    global = {
      typ: g.typ || 'fbh',
      tVL_neu: tVL, tRL_neu: tRL,
      faktor: leistungsFaktor({ typ: g.typ || 'fbh', tVL, tRL, tInnen: tInnen_default })
    };
  }

  return { flat, kreise, global };
}
