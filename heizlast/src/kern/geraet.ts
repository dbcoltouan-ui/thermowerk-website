/**
 * Wärmepumpen-Auswahl (Session 6): Gerätefilter, Dimensionierungs-Ampel (eine Logik, FLOW-10/11) und
 * Bivalenz nach FWS-Tabelle (Folie 95) statt synthetischer Kennlinie (Befund FACH-42).
 *
 *   r = Q_h / Q_WP            Q_WP = Heizleistung A−7/W35 laut Gerätedatenbank
 *   grün   inverterMin ≤ r ≤ 1          Kurs-Faustregel Inverter-WP: Q_h,max ≥ 0.75 · Q_WP (Folie 3)
 *   gelb   rotUnter ≤ r < inverterMin    WP überdimensioniert (Thermowerk-Band)
 *          1 < r ≤ knappBis              WP knapp, Spitze über Elektroeinsatz (Thermowerk-Band)
 *   rot    sonst
 *   Filter: Q_WP ∈ [Q_h · (1 − Toleranz), Q_h / inverterMin], Vorlauf max ≥ Auslegungs-VL (bzw. WW-Ladetemperatur),
 *           Kategorie Heizung, Quelle, Aufstellung, Schall; sortiert nach |Q_WP − Q_h|.
 *   Bivalenz: Leistungsanteil a = Q_WP / Q_h < 1 → Energieanteil WP aus Tabelle Folie 95 (linear, zwischen
 *           0.5 und 1.0 gegen «monovalent = 100 %» interpoliert — Annahme), unter 0.25 nicht abschätzbar.
 *
 * Gerätefilter, Gerätedetail, Speicher (Hersteller-Minimum) und Bericht lesen nur dieses Ergebnis.
 */
import type { FwsDaten } from '../daten/fws';
import type { WpDaten, WpGeraet } from '../daten/waermepumpen';
import type { Ampel, WpQuelle } from './typen';
import type { Hinweis, Wert } from './wert';
import { berechnet, fallback, fmt, schaetzung, tabelle } from './wert';

export interface GeraetFilterEingabe {
  quelle: WpQuelle;
  toleranzUntenProzent?: number | undefined;
  aufstellung?: 'aussen' | 'innen' | undefined;
  schallNachtMaxDb?: number | undefined;
  /** Vorlauf für den Filter manuell (sonst Auslegungs-VL). */
  vorlaufC?: number | undefined;
}

export interface GeraetEingabe {
  /** Auslegungsleistung Q_h [W]. */
  qh: Wert | null;
  /** Die eine Auslegungs-VL (Ergebnis Wärmeabgabe). */
  auslegungsVL: Wert | null;
  /** WW-Ladetemperatur [°C], nur wenn die WP künftig Warmwasser bereitet. */
  wwLadetemperaturC?: number | undefined;
  filter: GeraetFilterEingabe;
  auswahlId?: string | null | undefined;
}

export interface GeraetTreffer {
  id: string;
  bezeichnung: string;
  qWpW: number;
  vorlaufMaxC: number | null;
  verhaeltnis: number;
  ampel: Ampel;
  unplausibel: boolean;
  preisChf: number | null;
}

export interface Dimensionierung {
  /** r = Q_h / Q_WP [-]. */
  verhaeltnis: Wert;
  ampel: Ampel;
  text: string;
}

export interface Bivalenz {
  /** Leistungsanteil der WP an Q_h [-] (≤ 1). */
  leistungsanteil: Wert;
  monovalent: boolean;
  /** Energieanteil der WP [-] mit Band; null wenn ausserhalb der Kurstabelle. */
  energieanteil: Wert | null;
  text: string;
}

export interface GewaehltesGeraet {
  id: string;
  bezeichnung: string;
  qWp: Wert;
  vorlaufMax: Wert | null;
  mindestPuffer: Wert | null;
  dimensionierung: Dimensionierung;
  bivalenz: Bivalenz;
  hinweise: Hinweis[];
}

export interface GeraetErgebnis {
  quelle: WpQuelle;
  /** Vorlauf, mit dem gefiltert wird [°C]. */
  filterVorlauf: Wert | null;
  qWpMin: number | null;
  qWpMax: number | null;
  liste: GeraetTreffer[];
  gewaehlt: GewaehltesGeraet | null;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
}

const QUELLE_DB: Record<WpQuelle, string> = { luftWasser: 'luft', soleWasser: 'sole', wasserWasser: 'wasser' };

export function geraetBezeichnung(g: WpGeraet): string {
  return g.modell.startsWith(g.marke) ? g.modell : `${g.marke} ${g.modell}`;
}

/** Dimensionierungs-Ampel r = Q_h / Q_WP (eine Logik für Liste, Detail, Dashboard, Bericht). */
export function dimensionierung(qhW: number, qWpW: number, fws: FwsDaten): Dimensionierung {
  const g = fws.geraetewahl;
  const r = qWpW > 0 ? qhW / qWpW : 0;
  const v = berechnet(r, '', `r = Q_h / Q_WP = ${fmt(qhW / 1000, 2)} / ${fmt(qWpW / 1000, 2)} kW = ${fmt(r, 2)}`, [], { quelle: g.fundstelle });
  let ampel: Ampel;
  let text: string;
  if (!(qhW > 0) || !(qWpW > 0)) {
    ampel = 'grau';
    text = 'Q_h oder Q_WP fehlt';
  } else if (r >= g.inverterMinVerhaeltnis && r <= 1) {
    ampel = 'gruen';
    text = `WP deckt Q_h und ist höchstens ${fmt((1 / g.inverterMinVerhaeltnis - 1) * 100, 0)} % grösser (Inverter-Faustregel Q_h ≥ ${fmt(g.inverterMinVerhaeltnis, 2)} · Q_WP)`;
  } else if (r < g.inverterMinVerhaeltnis && r >= g.ueberdimensioniertRotUnter) {
    ampel = 'gelb';
    text = `WP ${fmt((1 / r - 1) * 100, 0)} % grösser als Q_h — überdimensioniert, kürzere Laufzeiten`;
  } else if (r < g.ueberdimensioniertRotUnter) {
    ampel = 'rot';
    text = `WP ${fmt((1 / r - 1) * 100, 0)} % grösser als Q_h — deutlich überdimensioniert`;
  } else if (r <= g.knappGelbBis) {
    ampel = 'gelb';
    text = `WP ${fmt((1 - 1 / r) * 100, 0)} % kleiner als Q_h — knapp, Spitze über Elektroeinsatz`;
  } else {
    ampel = 'rot';
    text = `WP ${fmt((1 - 1 / r) * 100, 0)} % kleiner als Q_h — zu klein, bivalenter Betrieb`;
  }
  return { verhaeltnis: v, ampel, text };
}

/** Bivalenz nach FWS M3 Folie 95 (Leistungsanteil → Energieanteil der WP). */
export function bivalenz(qhW: number, qWpW: number, fws: FwsDaten): Bivalenz {
  const a = qhW > 0 ? Math.min(1, qWpW / qhW) : 1;
  const leistungsanteil = berechnet(a, '', `Leistungsanteil WP = min(1, Q_WP / Q_h) = ${fmt(a, 2)}`, []);
  if (a >= 1) return { leistungsanteil, monovalent: true, energieanteil: berechnet(1, '', 'WP deckt Q_h allein (monovalent) — Energieanteil 100 %', []), text: 'monovalent' };
  const t = [...fws.bivalenz.tabelle].sort((x, y) => x.leistungsanteilWP - y.leistungsanteilWP);
  const punkte = [...t.map((z) => ({ a: z.leistungsanteilWP, lo: z.energieanteilWP[0] ?? 0, hi: z.energieanteilWP[1] ?? 0 })), { a: 1, lo: 1, hi: 1 }];
  const erster = punkte[0];
  if (!erster || a < erster.a) {
    return { leistungsanteil, monovalent: false, energieanteil: null, text: `Leistungsanteil ${fmt(a * 100, 0)} % liegt unter der Kurstabelle (${fmt((erster?.a ?? 0) * 100, 0)} %) — Energieanteil nicht abschätzbar` };
  }
  let lo = erster.lo;
  let hi = erster.hi;
  let interpoliert = false;
  for (let i = 0; i < punkte.length - 1; i++) {
    const p = punkte[i]!;
    const q = punkte[i + 1]!;
    if (a >= p.a && a <= q.a) {
      const k = q.a > p.a ? (a - p.a) / (q.a - p.a) : 0;
      lo = p.lo + k * (q.lo - p.lo);
      hi = p.hi + k * (q.hi - p.hi);
      interpoliert = k > 0 && k < 1;
      break;
    }
  }
  const mitte = (lo + hi) / 2;
  const text = `Leistungsanteil ${fmt(a * 100, 0)} % → Energieanteil WP ${fmt(lo * 100, 0)}–${fmt(hi * 100, 0)} %${interpoliert ? ' (linear interpoliert' + (a > 0.5 ? ', oberhalb 50 % gegen monovalent 100 % — Annahme)' : ')') : ''}`;
  const o = { band: [lo, hi] as [number, number], unsicherheit: mitte > 0 ? Math.round(((hi - lo) / 2 / mitte) * 1000) / 10 : 0 };
  const energieanteil = interpoliert && a > 0.5
    ? schaetzung(mitte, '', text, { ...o, stufe: 'interpoliert' })
    : tabelle(mitte, '', text, `FWS M3 ${fws.bivalenz.fundstelle}`, o);
  return { leistungsanteil, monovalent: false, energieanteil, text };
}

export function geraetWaehlen(e: GeraetEingabe, daten: { fws: FwsDaten; wp: WpDaten }): GeraetErgebnis {
  const hinweise: Hinweis[] = [];
  const annahmen: Wert<unknown>[] = [];
  const g = daten.fws.geraetewahl;
  const qh = e.qh?.wert ?? 0;

  // Vorlauf für den Filter: Override > Auslegungs-VL; WW-Ladetemperatur, wenn die WP Warmwasser bereitet.
  let filterVorlauf: Wert | null = null;
  if (e.filter.vorlaufC !== undefined) {
    filterVorlauf = { wert: e.filter.vorlaufC, einheit: '°C', herkunft: 'override', begruendung: `Filter-Vorlauf manuell ${fmt(e.filter.vorlaufC, 0)} °C${e.auslegungsVL ? ` (Auslegungs-VL ${fmt(e.auslegungsVL.wert, 1)} °C)` : ''}` };
    annahmen.push(filterVorlauf);
    if (e.auslegungsVL && e.filter.vorlaufC + 0.5 < e.auslegungsVL.wert) hinweise.push({ stufe: 'warnung', code: 'geraet.filterVorlaufZuTief', text: `Filter-Vorlauf ${fmt(e.filter.vorlaufC, 0)} °C liegt unter der Auslegungs-VL ${fmt(e.auslegungsVL.wert, 1)} °C.`, pfad: 'geraet.filterOverrides.vorlaufC' });
  } else if (e.auslegungsVL) {
    filterVorlauf = e.auslegungsVL;
  }
  if (e.wwLadetemperaturC !== undefined && (!filterVorlauf || e.wwLadetemperaturC > filterVorlauf.wert)) {
    filterVorlauf = berechnet(e.wwLadetemperaturC, '°C', `Filter-Vorlauf = WW-Ladetemperatur ${fmt(e.wwLadetemperaturC, 0)} °C (höher als Heizungs-Vorlauf${filterVorlauf ? ` ${fmt(filterVorlauf.wert, 1)} °C` : ''})`, []);
  }

  const tol = e.filter.toleranzUntenProzent ?? g.filterToleranzUntenProzent;
  if (e.filter.toleranzUntenProzent === undefined) {
    annahmen.push(fallback(g.filterToleranzUntenProzent, '%', `Filter: WP bis ${fmt(g.filterToleranzUntenProzent, 0)} % kleiner als Q_h zugelassen (Standardwert)`, { stufe: 'standardwert', quelle: 'fws.json geraetewahl (Thermowerk-Annahme)' }));
  }
  const qMin = qh > 0 ? qh * (1 - tol / 100) : null;
  const qMax = qh > 0 ? qh / g.inverterMinVerhaeltnis : null;
  if (!(qh > 0)) hinweise.push({ stufe: 'info', code: 'geraet.qhFehlt', text: 'Ohne Auslegungsleistung Q_h keine Geräteauswahl.' });

  const quelleDb = QUELLE_DB[e.filter.quelle];
  const liste: GeraetTreffer[] = [];
  if (qMin !== null && qMax !== null) {
    for (const d of daten.wp.geraete) {
      if (d.kategorie !== 'heizung' || d.quelle !== quelleDb) continue;
      const qWpW = (d.heizleistungA7W35KW ?? 0) * 1000;
      if (!(qWpW > 0) || qWpW < qMin || qWpW > qMax) continue;
      if (filterVorlauf && d.vorlaufMaxC !== null && d.vorlaufMaxC < filterVorlauf.wert) continue;
      if (e.filter.aufstellung && d.aufstellung && d.aufstellung !== e.filter.aufstellung) continue;
      if (e.filter.schallNachtMaxDb !== undefined && d.schallNachtMaxDb !== null && d.schallNachtMaxDb > e.filter.schallNachtMaxDb) continue;
      const dim = dimensionierung(qh, qWpW, daten.fws);
      liste.push({ id: d.id, bezeichnung: geraetBezeichnung(d), qWpW, vorlaufMaxC: d.vorlaufMaxC, verhaeltnis: dim.verhaeltnis.wert, ampel: dim.ampel, unplausibel: d.plausibilitaet.unplausibel, preisChf: d.preisChf });
    }
    liste.sort((a, b) => Math.abs(a.qWpW - qh) - Math.abs(b.qWpW - qh));
    if (!liste.length) hinweise.push({ stufe: 'warnung', code: 'geraet.keineTreffer', text: `Kein Gerät der Datenbank passt (Q_WP ${fmt(qMin / 1000, 1)}–${fmt(qMax / 1000, 1)} kW${filterVorlauf ? `, Vorlauf ≥ ${fmt(filterVorlauf.wert, 0)} °C` : ''}).` });
    if (quelleDb !== 'luft' && !daten.wp.geraete.some((d) => d.quelle === quelleDb)) hinweise.push({ stufe: 'info', code: 'geraet.quelleNichtInDb', text: 'Die Gerätedatenbank enthält heute nur Luft/Wasser-Wärmepumpen.' });
  }

  let gewaehlt: GewaehltesGeraet | null = null;
  if (e.auswahlId) {
    const d = daten.wp.geraete.find((x) => x.id === e.auswahlId);
    if (!d) hinweise.push({ stufe: 'warnung', code: 'geraet.auswahlUnbekannt', text: `Gewähltes Gerät «${e.auswahlId}» ist nicht (mehr) in der Datenbank.`, pfad: 'geraet.auswahlId' });
    else {
      const gh: Hinweis[] = [];
      const qWpW = (d.heizleistungA7W35KW ?? 0) * 1000;
      const quelleText = `waermepumpen.json ${d.id}${d.katalogseite ? `, Katalog S. ${d.katalogseite}` : ''}`;
      const qWp = tabelle(qWpW, 'W', `${geraetBezeichnung(d)}: Q_WP ${fmt(qWpW / 1000, 2)} kW bei A−7/W35 (Gerätedatenbank)`, quelleText);
      const vorlaufMax = d.vorlaufMaxC !== null ? tabelle(d.vorlaufMaxC, '°C', `Vorlauf max. ${fmt(d.vorlaufMaxC, 0)} °C (Gerätedatenbank)`, quelleText) : null;
      const mindestPuffer = d.mindestPufferLiter !== null ? tabelle(d.mindestPufferLiter, 'l', `Hersteller-Mindestpuffer ${fmt(d.mindestPufferLiter, 0)} l (Gerätedatenbank)`, quelleText) : null;
      if (d.kategorie !== 'heizung') gh.push({ stufe: 'fehler', code: 'geraet.keineHeizungsWp', text: `${geraetBezeichnung(d)} ist eine Brauchwasser-WP und kann nicht heizen.`, pfad: 'geraet.auswahlId' });
      if (d.plausibilitaet.unplausibel) gh.push({ stufe: 'warnung', code: 'geraet.unplausibel', text: `Datenbank-Werte von ${geraetBezeichnung(d)} sind unplausibel (${d.plausibilitaet.hinweis ?? 'COP × P passt nicht zu Q(A−7)'}) — Datenblatt prüfen.` });
      if (filterVorlauf && d.vorlaufMaxC !== null && d.vorlaufMaxC < filterVorlauf.wert) gh.push({ stufe: 'warnung', code: 'geraet.vorlaufZuTief', text: `Vorlauf max. ${fmt(d.vorlaufMaxC, 0)} °C liegt unter dem nötigen Vorlauf ${fmt(filterVorlauf.wert, 1)} °C.` });
      if (d.verifikationHinweis) gh.push({ stufe: 'info', code: 'geraet.verifikation', text: d.verifikationHinweis });
      gh.push({ stufe: 'info', code: 'geraet.kennlinie', text: g.hinweise[0] ?? '' });
      gewaehlt = { id: d.id, bezeichnung: geraetBezeichnung(d), qWp, vorlaufMax, mindestPuffer, dimensionierung: dimensionierung(qh, qWpW, daten.fws), bivalenz: bivalenz(qh, qWpW, daten.fws), hinweise: gh };
      if (gewaehlt.bivalenz.energieanteil && gewaehlt.bivalenz.energieanteil.herkunft !== 'berechnet') annahmen.push(gewaehlt.bivalenz.energieanteil);
      hinweise.push(...gh);
    }
  }
  return { quelle: e.filter.quelle, filterVorlauf, qWpMin: qMin, qWpMax: qMax, liste, gewaehlt, annahmen, hinweise };
}
