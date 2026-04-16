// Thermowerk Heizlast — Pure Rechenfunktionen
// Port von reference/old-calculator/js/heizlast.js nach TypeScript.
// Quellen: FWS Modul 3 (1-2025) §1–§12, §18, SIA 385/2 §8, SWKI BT 102-01, VDI 4645.
//
// Jede Funktion liefert ein CalcResult-Objekt {value, unit, steps, ...}.
// Die Rechenschritte (steps) werden in der UI für die optionale Anzeige „Formeln einbeziehen"
// gerendert. Die Schritt-Texte sind in Deutsch (Schweiz), weil sie direkt vom User gelesen werden.

import {
  PHYSIK, VOLLASTSTUNDEN, SPERRZEIT_FAKTOREN, BAUPERIODEN,
  SPEZ_HEIZLEISTUNG, SPEICHER_VERLUSTE,
} from './constants.ts';
import type {
  CalcResult, CalcStep, TvollProfil, Lage, VerlustFaktoren, PersonenEinheit,
} from './types.ts';

// -------------------------------------------------------------
// Hilfsfunktionen (intern)
// -------------------------------------------------------------
const round = (n: number, d = 2): number => Math.round(n * 10 ** d) / 10 ** d;
const fmt = (n: number, d = 2): string =>
  round(n, d).toLocaleString('de-CH', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

function result(
  value: number,
  unit: string,
  steps: CalcStep[],
  opts: Partial<CalcResult> = {},
): CalcResult {
  return { value, unit, steps, ...opts };
}

// -------------------------------------------------------------
// §2 NUTZENERGIE AUS BRENNSTOFFVERBRAUCH
// Qn = Ba · Ho · η   [kWh/a]
// -------------------------------------------------------------
export function qnAusVerbrauch(
  ba: number,
  ho: number,
  eta: number,
  opts: { label?: string; trennerEinheit?: string } = {},
): CalcResult {
  const { label = '', trennerEinheit = '' } = opts;
  const qn = ba * ho * eta;
  return result(qn, 'kWh/a', [
    { formel: `Qn = Ba · Ho · η${label ? ' (' + label + ')' : ''}`, wert: '' },
    { formel: `Qn = ${fmt(ba)} ${trennerEinheit} · ${fmt(ho, 2)} kWh · ${fmt(eta, 2)}`, wert: '' },
    { formel: `Qn`, wert: `${fmt(qn, 0)} kWh/a` },
  ]);
}

/** Bivalente Anlagen: Nutzenergien mehrerer Träger addieren. */
export function qnSumme(qnList: CalcResult[]): CalcResult {
  const summe = qnList.reduce((s, q) => s + q.value, 0);
  const steps: CalcStep[] = [
    { formel: 'Σ Qn,i  (bivalente Anlage)', wert: '' },
    ...qnList.map((q) => ({ formel: '+', wert: `${fmt(q.value, 0)} kWh/a` })),
    { formel: 'Qn,total', wert: `${fmt(summe, 0)} kWh/a` },
  ];
  return result(summe, 'kWh/a', steps);
}

// -------------------------------------------------------------
// §3 NORM-HEIZLAST Qhl = Qn / tvoll   [kW]
// -------------------------------------------------------------
export function qhlAusQn(qn: number, tvoll: number): CalcResult {
  const qhl = qn / tvoll;
  return result(qhl, 'kW', [
    { formel: 'Qhl = Qn / tvoll', wert: '' },
    { formel: `Qhl = ${fmt(qn, 0)} / ${fmt(tvoll, 0)}`, wert: '' },
    { formel: 'Qhl', wert: `${fmt(qhl, 2)} kW` },
  ]);
}

/** Vollaststunden-Richtwert abhängig von Gebäudetyp/Lage (FWS §3). */
export function tvollRichtwert(gebaeudetyp: TvollProfil, lage: Lage): number {
  const row = VOLLASTSTUNDEN.find((r) => r.gebaeudetyp === gebaeudetyp && r.lage === lage);
  return row ? row.tvoll : 2000;
}

/** Rückrechnung aus Betriebsstundenzähler (Aufgabe 4): Qn = h/a · Qh,WP. */
export function qnAusBetriebsstunden(
  stundenGesamt: number,
  jahre: number,
  qhWP: number,
): CalcResult {
  const hProJahr = stundenGesamt / jahre;
  const qn = hProJahr * qhWP;
  return result(qn, 'kWh/a', [
    {
      formel: 'h/a = Stunden gesamt / Jahre',
      wert: `${fmt(stundenGesamt, 0)} / ${fmt(jahre, 0)} = ${fmt(hProJahr, 0)} h/a`,
    },
    {
      formel: 'Qn = (h/a) · Qh,WP',
      wert: `${fmt(hProJahr, 0)} · ${fmt(qhWP, 2)} = ${fmt(qn, 0)} kWh/a`,
    },
  ]);
}

/** Schätzung aus Bauperiode + EBF (§6). */
export function qhlAusBauperiode(
  bauperiodeId: string,
  gebaeudetyp: 'efh' | 'mfh',
  ebf: number,
  tvoll: number,
): CalcResult | null {
  const bp = BAUPERIODEN.find((b) => b.id === bauperiodeId);
  if (!bp) return null;
  const [min, max] = bp[gebaeudetyp];
  const kwhMin = min * ebf;
  const kwhMax = max * ebf;
  const qhlMin = kwhMin / tvoll;
  const qhlMax = kwhMax / tvoll;
  return result(
    (qhlMin + qhlMax) / 2,
    'kW',
    [
      { formel: `Bauperiode ${bp.label} (${gebaeudetyp.toUpperCase()})`, wert: `${min}–${max} kWh/m²·a` },
      { formel: `Qn = spez · EBF`, wert: `${min}…${max} · ${ebf} = ${fmt(kwhMin, 0)}…${fmt(kwhMax, 0)} kWh/a` },
      { formel: `Qhl = Qn / tvoll`, wert: `${fmt(qhlMin, 2)}…${fmt(qhlMax, 2)} kW` },
    ],
    { range: [qhlMin, qhlMax] },
  );
}

// -------------------------------------------------------------
// §4 LEISTUNGSZUSCHLAG SPERRZEIT
// Qoff = Qhl · (24 / (24 − toff) − 1)
// -------------------------------------------------------------
export function qoff(qhl: number, toff: number): CalcResult {
  const faktor = toff >= 24 ? Infinity : 24 / (24 - toff) - 1;
  const qoffVal = qhl * faktor;
  const tabFaktor = SPERRZEIT_FAKTOREN[Math.round(toff)];
  return result(qoffVal, 'kW', [
    { formel: 'Qoff = Qhl · (24 / (24 − toff) − 1)', wert: '' },
    { formel: `Qoff = ${fmt(qhl, 2)} · (24 / (24 − ${toff}) − 1)`, wert: '' },
    { formel: `Qoff = ${fmt(qhl, 2)} · ${fmt(faktor, 4)}`, wert: '' },
    { formel: 'Qoff', wert: `${fmt(qoffVal, 2)} kW` },
    { formel: 'Kontrollfaktor Tabelle', wert: tabFaktor ? `${toff} h → ${(tabFaktor * 100).toFixed(0)} %` : '—' },
  ]);
}

// -------------------------------------------------------------
// §7 PLAUSIBILITÄTSKONTROLLE W/m²
// -------------------------------------------------------------
export function spezHeizleistung(
  qhl: number,
  ebf: number,
  bauperiodeId: string,
  gebaeudetyp: 'efh' | 'mfh',
): CalcResult | null {
  if (!ebf) return null;
  const wm2 = (qhl * 1000) / ebf;
  const ref = SPEZ_HEIZLEISTUNG.find((b) => b.id === bauperiodeId);
  const [rMin, rMax] = ref ? ref[gebaeudetyp] : [Number.NaN, Number.NaN];
  let ampel: 'grau' | 'gruen' | 'gelb' | 'rot' = 'grau';
  let hinweis = '';
  if (ref) {
    if (wm2 < rMin * 0.85) {
      ampel = 'rot';
      hinweis = 'Deutlich unter Band – Vollaststunden-Methode möglicherweise ungenau (Minergie-P, Leichtbau, hoher Glasanteil).';
    } else if (wm2 < rMin) {
      ampel = 'gelb';
      hinweis = 'Knapp unter Band – Vollaststunden prüfen.';
    } else if (wm2 > rMax * 1.15) {
      ampel = 'rot';
      hinweis = 'Deutlich über Band – Eingaben prüfen (η, Ho, Verbrauch).';
    } else if (wm2 > rMax) {
      ampel = 'gelb';
      hinweis = 'Knapp über Band.';
    } else {
      ampel = 'gruen';
      hinweis = 'Im typischen Bereich.';
    }
  }
  return result(
    wm2,
    'W/m²',
    [
      { formel: 'spez = Qhl / EBF', wert: `${fmt(qhl * 1000, 0)} W / ${fmt(ebf, 0)} m² = ${fmt(wm2, 1)} W/m²` },
      { formel: 'Referenzband', wert: ref ? `${rMin}–${rMax} W/m²` : '—' },
    ],
    { ampel, hinweis, refBand: ref ? [rMin, rMax] : null },
  );
}

// -------------------------------------------------------------
// §6 SANIERUNGS-DELTA (multiplikativ)
// Qhl,neu = Qhl · Π (1 − Einsparung_i)
// -------------------------------------------------------------
export function qhlNachSanierung(
  qhl: number,
  massnahmen: Array<{ id: string; label: string; einsparungProzent: number }>,
): CalcResult {
  const faktor = massnahmen.reduce((f, m) => f * (1 - m.einsparungProzent / 100), 1);
  const qhlNeu = qhl * faktor;
  const steps: CalcStep[] = [
    { formel: 'Qhl,neu = Qhl · Π (1 − Einsparung)', wert: '' },
    { formel: 'Qhl,neu = ' + fmt(qhl, 2) + ' kW', wert: '' },
    ...massnahmen.map((m) => ({
      formel: `× (1 − ${m.einsparungProzent}%)  [${m.label}]`,
      wert: `× ${fmt(1 - m.einsparungProzent / 100, 3)}`,
    })),
    { formel: 'Qhl,neu', wert: `${fmt(qhlNeu, 2)} kW  (Reduktion ${fmt((1 - faktor) * 100, 1)} %)` },
  ];
  return result(qhlNeu, 'kW', steps, { faktor, einsparungProzent: (1 - faktor) * 100 });
}

// -------------------------------------------------------------
// §8 WARMWASSERBEDARF
// -------------------------------------------------------------
/** Personenbelegung SIA 385/2: np = 3.3 − 2 / (1 + (ANF/100)³) */
export function personenbelegung(anf: number): CalcResult {
  const np = 3.3 - 2 / (1 + Math.pow(anf / 100, 3));
  return result(np, 'P', [
    { formel: 'np = 3.3 − 2 / (1 + (ANF/100)³)', wert: '' },
    { formel: `np = 3.3 − 2 / (1 + (${fmt(anf, 0)}/100)³)`, wert: '' },
    { formel: 'np', wert: `${fmt(np, 2)} P` },
  ]);
}

/** Nutzwarmwasserbedarf VW,u = Σ (np · VW,u,i)  [l/d] */
export function vwuTotal(einheiten: PersonenEinheit[]): CalcResult {
  let summe = 0;
  const teile = einheiten.map((e) => {
    const np = 3.3 - 2 / (1 + Math.pow(e.anf / 100, 3));
    const v = np * e.vwui;
    summe += v;
    return { np, v, ...e };
  });
  return result(summe, 'l/d', [
    { formel: 'VW,u = Σ (np,i · VW,u,i)', wert: '' },
    ...teile.map((t, i) => ({
      formel: `Einheit ${i + 1}: np=${fmt(t.np, 2)} · ${t.vwui} l/P`,
      wert: `${fmt(t.v, 1)} l/d`,
    })),
    { formel: 'VW,u', wert: `${fmt(summe, 0)} l/d` },
  ]);
}

/** Nutzwärmebedarf WW pro Tag: QW,u = V · cp · ΔT / 3600  [kWh/d] */
export function qwuTag(vwu: number, deltaT: number = PHYSIK.deltaT_ww): CalcResult {
  const qwu = vwu * PHYSIK.rho_wasser * PHYSIK.cp_wasser * PHYSIK.kJzukWh * deltaT;
  return result(qwu, 'kWh/d', [
    { formel: 'QW,u = V · ρ · cp · ΔT / 3600', wert: '' },
    { formel: `QW,u = ${fmt(vwu, 0)} · 1 · 4.2 · ${deltaT} / 3600`, wert: '' },
    { formel: 'QW,u', wert: `${fmt(qwu, 2)} kWh/d` },
  ]);
}

/** Kompakt-Jahresformel (wie im FWS-Aufgabenblatt verwendet):
 *  Qn,WW/a = V[l/d] · cp · ΔT / 3600 · Π(1+f_i) · 365 */
export function qnwwJahr(
  vwu: number,
  verluste: VerlustFaktoren,
  deltaT: number = PHYSIK.deltaT_ww,
): CalcResult {
  const faktorSpeicher = 1 + (verluste.speicher || 0);
  const faktorZirk = 1 + (verluste.zirk || 0);
  const faktorAusstoss = 1 + (verluste.ausstoss || 0);
  const faktorTotal = faktorSpeicher * faktorZirk * faktorAusstoss;
  const qnww = vwu * PHYSIK.cp_wasser * PHYSIK.kJzukWh * deltaT * faktorTotal * 365;
  const steps: CalcStep[] = [
    { formel: 'Qn,WW = V · cp · ΔT / 3600 · Π(1+f) · 365', wert: '' },
    {
      formel: 'Basis',
      wert: `${fmt(vwu, 0)} l/d · 4.2/3600 · ${deltaT} K · 365 d/a = ${fmt((vwu * 4.2) / 3600 * deltaT * 365, 0)} kWh/a`,
    },
    {
      formel: `Verluste Speicher ×${fmt(faktorSpeicher, 2)}  Zirk ×${fmt(faktorZirk, 2)}  Ausstoss ×${fmt(faktorAusstoss, 2)}`,
      wert: `× ${fmt(faktorTotal, 3)}`,
    },
    { formel: 'Qn,WW', wert: `${fmt(qnww, 0)} kWh/a` },
  ];
  return result(qnww, 'kWh/a', steps, { verlustFaktor: faktorTotal });
}

/** Speicherverluste aus FWS-Diagramm-Näherung (§8.2), linear interpoliert. */
export function speicherverlustAusVolumen(volumen: number): number | null {
  const tab = SPEICHER_VERLUSTE;
  if (volumen <= tab[0].volumen) return tab[0].verlust;
  if (volumen >= tab[tab.length - 1].volumen) return tab[tab.length - 1].verlust;
  for (let i = 0; i < tab.length - 1; i++) {
    if (volumen >= tab[i].volumen && volumen <= tab[i + 1].volumen) {
      const f = (volumen - tab[i].volumen) / (tab[i + 1].volumen - tab[i].volumen);
      return tab[i].verlust + f * (tab[i + 1].verlust - tab[i].verlust);
    }
  }
  return null;
}

/** QWW gesamt pro Tag = QW,u + Speicher- + Zirk- + Ausstoss-Verluste (§8). */
export function qwwTag(
  qwu: number,
  opts: {
    qstoLs?: number | null;
    qhlLs?: number | null;
    qemLs?: number | null;
    speicherProzent?: number | null;
    zirkProzent?: number | null;
    ausstossProzent?: number | null;
  } = {},
): CalcResult {
  const { qstoLs = null, qhlLs = null, qemLs = null,
          speicherProzent = null, zirkProzent = null, ausstossProzent = null } = opts;
  const sto = qstoLs != null ? qstoLs : (speicherProzent != null ? (qwu * speicherProzent) / 100 : 0);
  const hl  = qhlLs  != null ? qhlLs  : (zirkProzent     != null ? (qwu * zirkProzent)     / 100 : 0);
  const em  = qemLs  != null ? qemLs  : (ausstossProzent != null ? (qwu * ausstossProzent) / 100 : 0);
  const qww = qwu + sto + hl + em;
  return result(
    qww,
    'kWh/d',
    [
      { formel: 'QWW = QW,u + QW,sto,ls + QW,hl,ls + QW,em,ls', wert: '' },
      { formel: `QWW = ${fmt(qwu, 2)} + ${fmt(sto, 2)} + ${fmt(hl, 2)} + ${fmt(em, 2)}`, wert: '' },
      { formel: 'QWW', wert: `${fmt(qww, 2)} kWh/d` },
    ],
    { anteile: { qwu, sto, hl, em } },
  );
}

// -------------------------------------------------------------
// §9 LEISTUNGSZUSCHLAG WARMWASSER
// td = QWW / Qhl   [h/d]
// Qw = Qhl · (24 / (24 − td) − 1)
// -------------------------------------------------------------
export function qw(qhl: number, qwwTagVal: number): CalcResult {
  const td = qwwTagVal / qhl;
  const faktor = td >= 24 ? Infinity : 24 / (24 - td) - 1;
  const qwVal = qhl * faktor;
  return result(
    qwVal,
    'kW',
    [
      { formel: 'td = QWW / Qhl', wert: `${fmt(qwwTagVal, 2)} / ${fmt(qhl, 2)} = ${fmt(td, 2)} h/d` },
      { formel: 'Qw = Qhl · (24 / (24 − td) − 1)', wert: '' },
      { formel: `Qw = ${fmt(qhl, 2)} · (24 / (24 − ${fmt(td, 2)}) − 1)`, wert: '' },
      { formel: 'Qw', wert: `${fmt(qwVal, 2)} kW` },
    ],
    { td },
  );
}

// -------------------------------------------------------------
// §1 GESAMT-WP-AUSLEGUNG
// Qh = Qhl + Qw + Qoff + Qas
// -------------------------------------------------------------
export function qhGesamt(qhl: number, qwVal: number, qoffVal: number, qas: number = 0): CalcResult {
  const qh = qhl + qwVal + qoffVal + qas;
  return result(qh, 'kW', [
    { formel: 'Qh = Qhl + Qw + Qoff + Qas', wert: '' },
    { formel: `Qh = ${fmt(qhl, 2)} + ${fmt(qwVal, 2)} + ${fmt(qoffVal, 2)} + ${fmt(qas, 2)}`, wert: '' },
    { formel: 'Qh', wert: `${fmt(qh, 2)} kW` },
  ]);
}

/** §16.2 Inverter-Check: Qh,Gebäude ≥ 0.75 · QWP. */
export function inverterCheck(qhGebaeude: number, qWP: number): CalcResult {
  const verhaeltnis = qhGebaeude / qWP;
  const ok = verhaeltnis >= 0.75;
  return result(
    verhaeltnis,
    '',
    [
      { formel: 'Faustregel: Qh,Gebäude ≥ 0.75 · QWP', wert: '' },
      { formel: `Verhältnis = ${fmt(qhGebaeude, 2)} / ${fmt(qWP, 2)}`, wert: `${fmt(verhaeltnis, 2)}` },
      { formel: 'Beurteilung', wert: ok ? '✓ im Bereich (bis 25 % Überdimensionierung OK)' : '✗ WP zu gross – Überdimensionierung > 25 %' },
    ],
    { ok },
  );
}

// -------------------------------------------------------------
// §10 WW-SPEICHERVOLUMEN
// VW,Sto = QWW / (cp · ΔT / 3600)
// -------------------------------------------------------------
export function speichervolumen(
  qww: number,
  tStoAus: number = 60,
  tStoEin: number = PHYSIK.t_kaltwasser,
): CalcResult {
  const deltaT = tStoAus - tStoEin;
  const v = qww / (PHYSIK.cp_wasser * PHYSIK.kJzukWh * deltaT);
  return result(v, 'l', [
    { formel: 'VW,Sto = QWW / (cp · ΔT / 3600)', wert: '' },
    { formel: `VW,Sto = ${fmt(qww, 2)} / (4.2 · ${deltaT} / 3600)`, wert: '' },
    { formel: 'VW,Sto', wert: `${fmt(v, 0)} l` },
  ]);
}

/** Speichervolumen auf 5- oder 10-Liter-Schritte runden (User-Anforderung). */
export function rundeSpeicher(volumenL: number, schritt: 5 | 10 = 10): number {
  return Math.round(volumenL / schritt) * schritt;
}

// -------------------------------------------------------------
// §Aufgabe 4: Kälteleistung → spez. Entzugsleistung Sonde
// Qk = Qh · (COP − 1) / COP
// -------------------------------------------------------------
export function kaelteleistung(qh: number, cop: number): CalcResult {
  const qk = qh * (cop - 1) / cop;
  return result(qk, 'kW', [
    { formel: 'Qk = Qh · (COP − 1) / COP', wert: '' },
    { formel: `Qk = ${fmt(qh, 2)} · (${fmt(cop, 2)} − 1) / ${fmt(cop, 2)}`, wert: '' },
    { formel: 'Qk', wert: `${fmt(qk, 2)} kW` },
  ]);
}

export function spezEntzugsleistung(qk: number, sondenlaengeM: number): CalcResult {
  const wPerM = (qk * 1000) / sondenlaengeM;
  let ampel: 'gruen' | 'gelb' | 'rot' = 'gruen';
  let hinweis = '';
  if (wPerM > 60) {
    ampel = 'rot';
    hinweis = 'Zu hoch – Sondenlänge vergrössern (SIA 384/6 prüfen).';
  } else if (wPerM > 50) {
    ampel = 'gelb';
    hinweis = 'Grenzwertig – langjährige Sole-Temp.-Überwachung empfohlen.';
  } else {
    ampel = 'gruen';
    hinweis = 'Im üblichen Bereich.';
  }
  return result(
    wPerM,
    'W/m',
    [{ formel: 'spez = Qk / L', wert: `${fmt(qk * 1000, 0)} W / ${fmt(sondenlaengeM, 0)} m = ${fmt(wPerM, 1)} W/m` }],
    { ampel, hinweis },
  );
}

// -------------------------------------------------------------
// HEIZPUFFER-DIMENSIONIERUNG (SWKI BT 102-01 / VDI 4645 / Hersteller)
// Tool nimmt das Maximum aller zutreffenden Kriterien.
// -------------------------------------------------------------
/** (1) Abtauvolumen: V = Q_WP · t_Abtau[h] · 3600 / (cp · ΔT) */
export function puffer_abtau(
  qwp: number,
  opts: { tMin?: number; deltaT?: number; cp?: number } = {},
): CalcResult {
  const { tMin = 5, deltaT = 5, cp = 4.2 } = opts;
  const v = (qwp * (tMin / 60) * 3600) / (cp * deltaT);
  return result(v, 'l', [
    { formel: 'V = Q_WP · t_Abtau · 3600 / (cp · ΔT)', wert: '' },
    { formel: `V = ${fmt(qwp, 2)} · ${tMin}/60 · 3600 / (${cp} · ${deltaT})`, wert: '' },
    { formel: 'V', wert: `${fmt(v, 0)} l` },
  ]);
}

/** (2) Taktschutz: V = Q_WP · t_min · 3600 / (cp · ΔT) */
export function puffer_takt(
  qwp: number,
  opts: { tMin?: number; deltaT?: number; cp?: number } = {},
): CalcResult {
  const { tMin = 6, deltaT = 5, cp = 4.2 } = opts;
  const v = (qwp * (tMin / 60) * 3600) / (cp * deltaT);
  return result(v, 'l', [
    { formel: 'V = Q_WP · t_min · 3600 / (cp · ΔT)', wert: '' },
    { formel: `V = ${fmt(qwp, 2)} · ${tMin}/60 · 3600 / (${cp} · ${deltaT})`, wert: '' },
    { formel: 'V', wert: `${fmt(v, 0)} l` },
  ]);
}

/** (3) ERR-Entkopplung (Hersteller-Band, keine Formel). */
export function puffer_err(qwp: number, bandLproKw: [number, number] = [15, 25]): CalcResult {
  const [min, max] = bandLproKw;
  return result(
    qwp * max,
    'l',
    [
      { formel: 'V = Q_WP · (Herstellerband l/kW)', wert: '' },
      { formel: `V = ${fmt(qwp, 2)} · ${min}…${max}`, wert: `${fmt(qwp * min, 0)}…${fmt(qwp * max, 0)} l` },
    ],
    { range: [qwp * min, qwp * max] },
  );
}

/** Sperrzeitüberbrückung (informativ — meist unrealistisch gross). */
export function puffer_sperrzeit(qhl: number, toff: number, deltaT: number = 10, cp: number = 4.2): CalcResult {
  const v = (qhl * toff * 3600) / (cp * deltaT);
  return result(v, 'l', [
    { formel: 'V = Qhl · t_off · 3600 / (cp · ΔT)', wert: '' },
    { formel: `V = ${fmt(qhl, 2)} · ${toff} · 3600 / (${cp} · ${deltaT})`, wert: '' },
    { formel: 'V', wert: `${fmt(v, 0)} l` },
  ]);
}

// -------------------------------------------------------------
// Sammel-Export (für einfachen Import in Komponenten/Tests)
// -------------------------------------------------------------
export const formulas = {
  qnAusVerbrauch, qnSumme, qhlAusQn, qhlAusBauperiode, qnAusBetriebsstunden,
  qoff, spezHeizleistung, qhlNachSanierung,
  personenbelegung, vwuTotal, qwuTag, qnwwJahr, qwwTag, speicherverlustAusVolumen,
  qw, qhGesamt, inverterCheck,
  speichervolumen, rundeSpeicher, kaelteleistung, spezEntzugsleistung,
  puffer_abtau, puffer_takt, puffer_err, puffer_sperrzeit,
  tvollRichtwert,
};
