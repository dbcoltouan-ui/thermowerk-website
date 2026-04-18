// Thermowerk Heizlast — Derived Compute-Store
import { computed } from 'nanostores';
import { heizlastState } from './state.ts';
import type { HeizlastState, SanierungsMassnahme, VerbrauchPeriode, MessungPeriode, BstdPeriode } from './state.ts';

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

// ---------------------------------------------------------------
// Phase 10 / Paket B — Perioden-Algorithmus (§ 3)
// ---------------------------------------------------------------

/** Anzahl Tage zwischen zwei ISO-Datumstrings (bisDatum exklusiv). */
function tagezwischen(vonDatum: string, bisDatum: string): number {
  const von = new Date(vonDatum).getTime();
  const bis = new Date(bisDatum).getTime();
  return Math.round((bis - von) / 86400000);
}

/** Internes Struktur für einen Perioden-Wert nach Ist-Zustand-Rekonstruktion. */
interface PeriodeWert {
  vonDatum: string;
  bisDatum: string;
  wert: number;
}

/**
 * Aggregiert eine Perioden-Liste zum Jahresäquivalent (365 Tage).
 * Gibt null zurück wenn die Liste leer ist oder Überlappungen enthält.
 * § 3.1
 */
function aggregierePerioden(liste: PeriodeWert[]): number | null {
  if (liste.length === 0) return null;

  // Sortieren nach vonDatum
  const sorted = [...liste].sort((a, b) => a.vonDatum.localeCompare(b.vonDatum));

  // Überlappungen prüfen
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].vonDatum < sorted[i - 1].bisDatum) return null; // Überlappung
  }

  let tage_total = 0;
  let wert_total = 0;
  for (const p of sorted) {
    const t = tagezwischen(p.vonDatum, p.bisDatum);
    if (t <= 0) continue;
    tage_total += t;
    wert_total += p.wert;
  }

  if (tage_total <= 0) return null;
  return wert_total * 365 / tage_total;
}

/**
 * Bringt einen Perioden-Messwert auf den Ist-Zustand (nach allen vergangenen
 * Sanierungen). Sanierungen innerhalb der Periode werden per Sub-Perioden-Split
 * herausgerechnet. § 3.2
 */
function periodeAufIstZustand(
  p: PeriodeWert,
  san_vergangen: SanierungsMassnahme[],
): PeriodeWert {
  if (san_vergangen.length === 0) return p;

  const L = tagezwischen(p.vonDatum, p.bisDatum);
  if (L <= 0) return p;

  // Sanierungen relativ zur Periode klassifizieren
  const in_periode = san_vergangen.filter(
    (s) => s.datum! > p.vonDatum && s.datum! < p.bisDatum,
  );
  const nach_periode = san_vergangen.filter((s) => s.datum! >= p.bisDatum);

  // Keine In-Periode-Sanierungen: Vereinfachter Pfad
  if (in_periode.length === 0) {
    if (nach_periode.length === 0) return p;
    const F_nach = nach_periode.reduce(
      (f, s) => f * (1 - s.einsparungProzent / 100), 1.0,
    );
    return { ...p, wert: p.wert * F_nach };
  }

  // Sub-Perioden bilden (aufsteigend sortiert — san_vergangen ist bereits sortiert)
  const grenzen = [p.vonDatum, ...in_periode.map((s) => s.datum!), p.bisDatum];

  // Kumulative Split-Faktoren
  const F: number[] = [1.0];
  let F_kum = 1.0;
  for (const s of in_periode) {
    F_kum *= 1 - s.einsparungProzent / 100;
    F.push(F_kum);
  }

  // Nenner = Σ(L_j · F_j)
  let nenner = 0;
  for (let j = 0; j < F.length; j++) {
    const L_j = tagezwischen(grenzen[j], grenzen[j + 1]);
    nenner += L_j * F[j];
  }
  if (nenner <= 0) return p;

  // Vor-Sanierungs-Wert rekonstruieren
  const wert_pre = p.wert * L / nenner;

  // Auf Post-In-Periode-Zustand bringen
  const wert_post = wert_pre * F[F.length - 1];

  // Nach-Periode-Sanierungen anwenden
  const F_nach = nach_periode.reduce(
    (f, s) => f * (1 - s.einsparungProzent / 100), 1.0,
  );
  return { ...p, wert: wert_post * F_nach };
}

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

function qhlVerbrauch(
  s: HeizlastState,
  tvoll: number,
  san_vergangen: SanierungsMassnahme[],
): CalcResult | null {
  const v = s.heizlast.verbrauch;
  const brenn = BRENNWERTE[v.energietraeger];
  if (!brenn || !tvoll) return null;

  let ba_jahr: number;
  const perioden = v.perioden || [];

  if (perioden.length > 0) {
    // Perioden auf Ist-Zustand bringen und aggregieren
    const perioden_ist: PeriodeWert[] = perioden.map((p) =>
      periodeAufIstZustand({ vonDatum: p.vonDatum, bisDatum: p.bisDatum, wert: p.wert }, san_vergangen),
    );
    const agg = aggregierePerioden(perioden_ist);
    if (agg === null || agg <= 0) return null;
    ba_jahr = agg;
  } else {
    // Legacy-Fallback: Einzelwert
    if (!v.ba || v.ba <= 0) return null;
    ba_jahr = v.ba;
  }

  const eta = resolveEta(s);
  const qnBrutto = qnAusVerbrauch(ba_jahr, brenn.ho, eta, {
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

function qhlMessung(
  s: HeizlastState,
  tvoll: number,
  san_vergangen: SanierungsMassnahme[],
): CalcResult | null {
  if (!tvoll) return null;
  const perioden = s.heizlast.messung.perioden || [];

  let qn_jahr: number;
  if (perioden.length > 0) {
    const perioden_ist: PeriodeWert[] = perioden.map((p) =>
      periodeAufIstZustand({ vonDatum: p.vonDatum, bisDatum: p.bisDatum, wert: p.wertKWh }, san_vergangen),
    );
    const agg = aggregierePerioden(perioden_ist);
    if (agg === null || agg <= 0) return null;
    qn_jahr = agg;
  } else {
    const qn = s.heizlast.messung.qnPerJahr;
    if (!qn || qn <= 0) return null;
    qn_jahr = qn;
  }

  return qhlAusQn(qn_jahr, tvoll);
}

function qhlBstd(
  s: HeizlastState,
  tvoll: number,
  san_vergangen: SanierungsMassnahme[],
): CalcResult | null {
  const b = s.heizlast.bstd;
  if (!b.qhWP || !tvoll) return null;
  const perioden = b.perioden || [];

  let stunden_pro_jahr: number;
  if (perioden.length > 0) {
    const perioden_ist: PeriodeWert[] = perioden.map((p) =>
      periodeAufIstZustand({ vonDatum: p.vonDatum, bisDatum: p.bisDatum, wert: p.stunden }, san_vergangen),
    );
    const agg = aggregierePerioden(perioden_ist);
    if (agg === null || agg <= 0) return null;
    stunden_pro_jahr = agg;
  } else {
    if (!b.stundenGesamt || !b.jahre) return null;
    stunden_pro_jahr = b.stundenGesamt / b.jahre;
  }

  const qnRes = qnAusBetriebsstunden(stunden_pro_jahr, 1, b.qhWP);
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
 * Phase 9 / Block B — Auto-Erkennung in fester Reihenfolge.
 * Phase 10 / Paket B — Vergangene Sanierungen werden für Perioden-Rekonstruktion
 * extrahiert und an die Methoden-Funktionen übergeben (§ 3.3).
 * Reihenfolge: override → bstd → messung → verbrauch → bauperiode.
 */
function computeQhlRaw(s: HeizlastState, tvoll: number): CalcResult | null {
  const m = s.heizlast.methodsEnabled;

  // Vergangene Sanierungen für Perioden-Rekonstruktion (§ 3.2)
  const allMassnahmen = s.heizlast.sanierungActive
    ? (s.heizlast.sanierungMassnahmen || [])
    : [];
  const san_vergangen: SanierungsMassnahme[] = allMassnahmen
    .filter((san) => san.zeitpunkt === 'vergangen' && !!san.datum)
    .sort((a, b) => (a.datum! < b.datum! ? -1 : 1));

  if (m?.override) {
    const r = qhlOverride(s);
    if (r) return r;
  }
  if (m?.bstd) {
    const r = qhlBstd(s, tvoll, san_vergangen);
    if (r) return r;
  }
  if (m?.messung) {
    const r = qhlMessung(s, tvoll, san_vergangen);
    if (r) return r;
  }
  if (m?.verbrauch) {
    const r = qhlVerbrauch(s, tvoll, san_vergangen);
    if (r) return r;
  }
  return qhlBauperiode(s, tvoll);
}

function computeQhlKorr(s: HeizlastState, qhlRaw: CalcResult | null): CalcResult | null {
  if (!qhlRaw) return null;
  if (!s.heizlast.sanierungActive) return qhlRaw;
  const massnahmen = s.heizlast.sanierungMassnahmen;
  if (!massnahmen || massnahmen.length === 0) return qhlRaw;
  // Phase 10 / Paket B: Nur geplante Sanierungen (oder ohne Datum) werden hier
  // multiplikativ angewendet. Vergangene wurden bereits in der Perioden-Rekonstruktion
  // berücksichtigt. Objekte ohne `datum`-Feld (Altdaten) werden wie geplant behandelt.
  const san_geplant = massnahmen.filter((m) => m.zeitpunkt === 'geplant' || !m.datum);
  if (san_geplant.length === 0) return qhlRaw;
  return qhlNachSanierung(qhlRaw.value, san_geplant);
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
