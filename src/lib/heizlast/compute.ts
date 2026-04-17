// Thermowerk Heizlast — Derived Compute-Store
import { computed } from 'nanostores';
import { heizlastState } from './state.ts';
import type { HeizlastState } from './state.ts';

import {
  qnAusVerbrauch,
  qhlAusQn,
  qhlAusBauperiode,
  qnAusBetriebsstunden,
  qhlNachSanierung,
  spezHeizleistung,
  vwuTotal,
  qwuTag,
  qnwwJahr,
  qwwTag,
  qw as qwCalc,
  qoff as qoffCalc,
  qhGesamt,
  speichervolumen,
  rundeSpeicher,
  rundeSpeicherMarkt,
  puffer_abtau,
  puffer_takt,
  puffer_err,
  puffer_sperrzeit,
  tvollRichtwert,
} from './calculations.ts';
import { BRENNWERTE, WIRKUNGSGRADE, PHYSIK } from './constants.ts';
import type { CalcResult } from './types.ts';

export interface ComputeResult {
  tvoll: number;
  qhlRaw: CalcResult | null;
  qhlKorr: CalcResult | null;
  plausi: CalcResult | null;
  vwu: CalcResult | null;
  qwu: CalcResult | null;
  qwwTagVal: CalcResult | null;
  qw: CalcResult | null;
  qoff: CalcResult | null;
  qh: CalcResult | null;
  wwSpeicherRoh: CalcResult | null;
  wwSpeicherGerundet: number | null;
  pufferRoh: CalcResult | null;
  pufferGerundet: number | null;
  summary: {
    qhlKw: number | null;
    qhKw: number | null;
    wm2: number | null;
    wwSpeicherL: number | null;
    pufferL: number | null;
  };
}

function resolveTvoll(s: HeizlastState): number {
  if (s.gebaeude.tvollOverride != null) return s.gebaeude.tvollOverride;
  return tvollRichtwert(s.gebaeude.tvollProfil, s.gebaeude.lage);
}

function resolveEta(s: HeizlastState): number {
  const v = s.heizlast.verbrauch;
  if (v.etaOverride != null) return v.etaOverride;
  const wg = WIRKUNGSGRADE.find((w) => w.id === v.etaWirkungsgradId);
  return wg ? wg.default : 0.85;
}

function gebaeudetypNumerisch(s: HeizlastState): 'efh' | 'mfh' {
  return s.gebaeude.typ === 'mfh' ? 'mfh' : 'efh';
}

// --- Einzel-Methoden (Phase 9 / Block B) ---
// Jede Methode bekommt ihre eigene Funktion und liefert entweder ein
// `CalcResult` oder null (wenn die Eingaben unvollstaendig sind). Die
// Hierarchie in `computeQhlRaw` arbeitet die aktivierten Methoden in fester
// Reihenfolge ab: override > bstd > messung > verbrauch > bauperiode.

function qhlVerbrauch(s: HeizlastState, tvoll: number): CalcResult | null {
  const v = s.heizlast.verbrauch;
  const brenn = BRENNWERTE[v.energietraeger];
  if (!brenn || !v.ba || v.ba <= 0 || !tvoll) return null;
  const eta = resolveEta(s);
  const qnBrutto = qnAusVerbrauch(v.ba, brenn.ho, eta, {
    label: brenn.label,
    trennerEinheit: brenn.verbrauchEinheit,
  });
  let qnHeiz = qnBrutto.value;
  if (v.inklWW && v.vwuAbzug > 0) {
    const deltaT = s.warmwasser.deltaTOverride ?? PHYSIK.deltaT_ww;
    const qnww = qnwwJahr(
      v.vwuAbzug,
      {
        speicher: (s.warmwasser.speicherProzent ?? 0) / 100,
        zirk: (s.warmwasser.zirkProzent ?? 0) / 100,
        ausstoss: (s.warmwasser.ausstossProzent ?? 0) / 100,
      },
      deltaT,
    );
    qnHeiz = qnBrutto.value - qnww.value;
  }
  return qhlAusQn(qnHeiz, tvoll);
}

function qhlMessung(s: HeizlastState, tvoll: number): CalcResult | null {
  const qn = s.heizlast.messung.qnPerJahr;
  if (!qn || qn <= 0 || !tvoll) return null;
  return qhlAusQn(qn, tvoll);
}

function qhlBstd(s: HeizlastState, tvoll: number): CalcResult | null {
  const b = s.heizlast.bstd;
  if (!b.stundenGesamt || !b.jahre || !b.qhWP || !tvoll) return null;
  const qnRes = qnAusBetriebsstunden(b.stundenGesamt, b.jahre, b.qhWP);
  return qhlAusQn(qnRes.value, tvoll);
}

function qhlBauperiode(s: HeizlastState, tvoll: number): CalcResult | null {
  const { bauperiode, ebf } = s.gebaeude;
  if (!ebf || !bauperiode) return null;
  return qhlAusBauperiode(bauperiode, gebaeudetypNumerisch(s), ebf, tvoll);
}

function qhlOverride(s: HeizlastState): CalcResult | null {
  const q = s.heizlast.override.qhl;
  if (!q || q <= 0) return null;
  return {
    value: q,
    unit: 'kW',
    steps: [{ formel: 'Qhl (direkt eingegeben)', wert: q.toFixed(2) + ' kW' }],
  };
}

/**
 * Phase 9 / Block B — Auto-Erkennung in fester Reihenfolge. Die erste
 * aktivierte Methode, die ein gueltiges Ergebnis liefert, gewinnt.
 * Reihenfolge: override → bstd → messung → verbrauch → bauperiode.
 * `bauperiode` laeuft immer als Fallback, auch wenn im Record nichts aktiv
 * ist — solange Lage, Bauperiode und EBF gesetzt sind.
 */
function computeQhlRaw(s: HeizlastState, tvoll: number): CalcResult | null {
  const m = s.heizlast.methodsEnabled;
  if (m?.override) {
    const r = qhlOverride(s);
    if (r) return r;
  }
  if (m?.bstd) {
    const r = qhlBstd(s, tvoll);
    if (r) return r;
  }
  if (m?.messung) {
    const r = qhlMessung(s, tvoll);
    if (r) return r;
  }
  if (m?.verbrauch) {
    const r = qhlVerbrauch(s, tvoll);
    if (r) return r;
  }
  return qhlBauperiode(s, tvoll);
}

function computeQhlKorr(s: HeizlastState, qhlRaw: CalcResult | null): CalcResult | null {
  if (!qhlRaw) return null;
  if (!s.heizlast.sanierungActive) return qhlRaw;
  const massnahmen = s.heizlast.sanierungMassnahmen;
  if (!massnahmen || massnahmen.length === 0) return qhlRaw;
  return qhlNachSanierung(qhlRaw.value, massnahmen);
}

function computePlausi(s: HeizlastState, qhlKorr: CalcResult | null): CalcResult | null {
  // Phase 9 / Block H: Plausibilitaet laeuft immer, kein Gate mehr. Anzeige-Gate
  // erfolgt nur noch im Export (hz-print-plausi-on), nicht in der Berechnung.
  if (!qhlKorr) return null;
  return spezHeizleistung(qhlKorr.value, s.gebaeude.ebf, s.gebaeude.bauperiode, gebaeudetypNumerisch(s));
}

function computeWarmwasser(s: HeizlastState, qhlKorr: CalcResult | null): {
  vwu: CalcResult | null;
  qwu: CalcResult | null;
  qwwTagVal: CalcResult | null;
  qw: CalcResult | null;
} {
  const empty = { vwu: null, qwu: null, qwwTagVal: null, qw: null };
  if (!s.warmwasser.active) return empty;
  const deltaT = s.warmwasser.deltaTOverride ?? PHYSIK.deltaT_ww;
  let vwu: CalcResult | null = null;
  let qwu: CalcResult | null = null;
  let qwwTagVal: CalcResult | null = null;
  switch (s.warmwasser.method) {
    case 'personen': {
      const einheiten = s.warmwasser.personen.filter((p) => p.anf > 0 && p.vwui > 0);
      if (einheiten.length === 0) return empty;
      vwu = vwuTotal(einheiten);
      qwu = qwuTag(vwu.value, deltaT);
      break;
    }
    case 'direkt': {
      const v = s.warmwasser.direkt.vwuPerTag;
      if (!v || v <= 0) return empty;
      vwu = { value: v, unit: 'l/d', steps: [{ formel: 'VW,u (direkt eingegeben)', wert: v + ' l/d' }] };
      qwu = qwuTag(v, deltaT);
      break;
    }
    case 'messung': {
      const qww = s.warmwasser.messung.qwwTagKWh;
      if (!qww || qww <= 0) return empty;
      qwu = { value: qww, unit: 'kWh/d', steps: [{ formel: 'QW,u (gemessen)', wert: qww.toFixed(2) + ' kWh/d' }] };
      break;
    }
  }
  if (qwu) {
    qwwTagVal = qwwTag(qwu.value, {
      speicherProzent: s.warmwasser.speicherProzent,
      zirkProzent: s.warmwasser.zirkProzent,
      ausstossProzent: s.warmwasser.ausstossProzent,
    });
  }
  let qwResult: CalcResult | null = null;
  if (qhlKorr && qwwTagVal) {
    qwResult = qwCalc(qhlKorr.value, qwwTagVal.value);
  }
  return { vwu, qwu, qwwTagVal, qw: qwResult };
}

function computeQoff(s: HeizlastState, qhlKorr: CalcResult | null): CalcResult | null {
  if (!qhlKorr) return null;
  // Block D: Ja/Nein-Gate. Ist der Sperrzeit-Toggle aus, traegt Qoff nichts
  // zur WP-Auslegung bei — die FWS-Korrekturtabelle wird gar nicht aktiviert.
  if (!s.zuschlaege.sperrzeitActive) {
    return { value: 0, unit: 'kW', steps: [{ formel: 'Qoff', wert: 'keine Sperrzeit — 0 kW' }] };
  }
  const toff = s.zuschlaege.toff;
  if (toff == null || toff < 0) return null;
  if (toff === 0) {
    return { value: 0, unit: 'kW', steps: [{ formel: 'Qoff', wert: 'keine Sperrzeit — 0 kW' }] };
  }
  return qoffCalc(qhlKorr.value, toff);
}

function computeWwSpeicher(s: HeizlastState, qwwTagVal: CalcResult | null): { roh: CalcResult | null; gerundet: number | null } {
  if (!s.speicher.wwActive || !qwwTagVal) return { roh: null, gerundet: null };
  const tEin = s.speicher.wwTStoEinOverride ?? PHYSIK.t_kaltwasser;
  const roh = speichervolumen(qwwTagVal.value, s.speicher.wwTStoAus, tEin);
  // Phase 9 / Block J: Marktrealistische Staffelung (CH-WP-Markt), Legacy-Feld
  // `wwRundungLiter` wird nicht mehr gelesen (bleibt fuer Migration).
  void s.speicher.wwRundungLiter;
  const gerundet = rundeSpeicherMarkt(roh.value, 'ww');
  return { roh, gerundet };
}

function computePuffer(s: HeizlastState, qh: CalcResult | null, qhlKorr: CalcResult | null): { roh: CalcResult | null; gerundet: number | null } {
  if (!s.speicher.pufferActive) return { roh: null, gerundet: null };
  let roh: CalcResult | null = null;
  const sp = s.speicher;
  const qwp = qh?.value ?? qhlKorr?.value ?? 0;
  if (qwp <= 0) return { roh: null, gerundet: null };
  switch (sp.pufferMethod) {
    case 'abtau':
      roh = puffer_abtau(qwp, { tMin: sp.pufferTAbtauMin, deltaT: sp.pufferDeltaT });
      break;
    case 'takt':
      roh = puffer_takt(qwp, { tMin: sp.pufferTTaktMin, deltaT: sp.pufferDeltaT });
      break;
    case 'err':
      roh = puffer_err(qwp, sp.pufferErrBand);
      break;
    case 'sperrzeit':
      if (qhlKorr) roh = puffer_sperrzeit(qhlKorr.value, s.zuschlaege.toff, sp.pufferDeltaT);
      break;
  }
  if (!roh) return { roh: null, gerundet: null };
  // Phase 9 / Block J: Marktrealistische Staffelung, Legacy-Feld `pufferRundungLiter` ignoriert.
  void sp.pufferRundungLiter;
  const gerundet = rundeSpeicherMarkt(roh.value, 'puffer');
  return { roh, gerundet };
}

export function runCascade(s: HeizlastState): ComputeResult {
  const tvoll = resolveTvoll(s);
  const qhlRaw = computeQhlRaw(s, tvoll);
  const qhlKorr = computeQhlKorr(s, qhlRaw);
  const plausi = computePlausi(s, qhlKorr);
  const { vwu, qwu, qwwTagVal, qw } = computeWarmwasser(s, qhlKorr);
  const qoff = computeQoff(s, qhlKorr);
  let qh: CalcResult | null = null;
  if (qhlKorr && qoff) {
    // Block D: Qas wird automatisch addiert, sobald ein Wert > 0 vorliegt.
    // Der frueher noetige `qasActive`-Switch ist entfallen — das Feld bleibt
    // ausschliesslich als Legacy im State (siehe ZuschlaegeState.qasActive).
    const qasVal = Number(s.zuschlaege.qas);
    const qas = Number.isFinite(qasVal) && qasVal > 0 ? qasVal : 0;
    qh = qhGesamt(qhlKorr.value, qw?.value ?? 0, qoff.value, qas);
  }
  const ww = computeWwSpeicher(s, qwwTagVal);
  const puf = computePuffer(s, qh, qhlKorr);
  return {
    tvoll,
    qhlRaw,
    qhlKorr,
    plausi,
    vwu,
    qwu,
    qwwTagVal,
    qw,
    qoff,
    qh,
    wwSpeicherRoh: ww.roh,
    wwSpeicherGerundet: ww.gerundet,
    pufferRoh: puf.roh,
    pufferGerundet: puf.gerundet,
    summary: {
      qhlKw: qhlKorr?.value ?? null,
      qhKw: qh?.value ?? null,
      wm2: plausi?.value ?? null,
      wwSpeicherL: ww.gerundet,
      pufferL: puf.gerundet,
    },
  };
}

export const heizlastCompute = computed(heizlastState, (s) => runCascade(s));
