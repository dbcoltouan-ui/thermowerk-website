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
import type { Skala } from './skala';
import { skalaWpGroesse } from './skala';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fallback, fmt, schaetzung, tabelle } from './wert';

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
  /** Heizleistung des gewählten Geräts am Auslegungspunkt (θe, Auslegungs-VL) laut Datenblatt [W] — Folie 93. */
  qWpAuslegungW?: number | undefined;
}

export interface GeraetTreffer {
  id: string;
  bezeichnung: string;
  qWpW: number;
  vorlaufMaxC: number | null;
  verhaeltnis: number;
  /** (Q_WP / Q_h − 1) · 100 [%]. */
  uebergroesseProzent: number;
  ampel: Ampel;
  unplausibel: boolean;
  preisChf: number | null;
}

export interface Dimensionierung {
  /** r = Q_h / Q_WP [-]. */
  verhaeltnis: Wert;
  /** Übergrösse der WP gegenüber Q_h [%] (negativ = zu klein). */
  uebergroesse: Wert;
  ampel: Ampel;
  text: string;
  /** Prozent-Skala mit grünen/gelben/roten Bereichen (UI zeichnet nur). */
  skala: Skala;
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
  /** Heizleistung laut Datenbank (A−7/W35). */
  qWp: Wert;
  /** Massgebend für Dimensionierung/Bivalenz: Datenblattwert am Auslegungspunkt, sonst qWp. */
  qWpMassgebend: Wert;
  vorlaufMax: Wert | null;
  mindestPuffer: Wert | null;
  /** Modulationsbereich laut Gerätedatenbank (nur wenn erfasst) und Anteil der unteren Grenze an Q_h. */
  modulation: Modulation | null;
  dimensionierung: Dimensionierung;
  bivalenz: Bivalenz;
  hinweise: Hinweis[];
}

export interface Modulation {
  minW: Wert;
  maxW: Wert;
  /** Untere Modulationsgrenze / Q_h [-]; null ohne Q_h. Je kleiner, desto weniger taktet die WP in der Übergangszeit. */
  anteilMinAnQh: Wert | null;
}

export interface GeraetErgebnis {
  quelle: WpQuelle;
  /** Vorlauf, mit dem gefiltert wird [°C]. */
  filterVorlauf: Wert | null;
  /** Vorlauf, mit dem ohne eigene Angabe gefiltert würde (Auslegungs-VL bzw. WW-Ladetemperatur) — Standardwert des Filterfelds. */
  filterVorlaufStandard: Wert | null;
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
  const ok = qhW > 0 && qWpW > 0;
  const r = ok ? qhW / qWpW : 0;
  const d = ok ? (qWpW / qhW - 1) * 100 : null;
  const verhaeltnis = berechnet(r, '', `r = Q_h / Q_WP = ${fmt(qhW / 1000, 2)} / ${fmt(qWpW / 1000, 2)} kW = ${fmt(r, 2)}`, [], { quelle: g.fundstelle });
  const uebergroesse = berechnet(d ?? 0, '%', ok ? `Übergrösse = Q_WP / Q_h − 1 = ${fmt(qWpW / 1000, 2)} / ${fmt(qhW / 1000, 2)} kW − 1 = ${d! >= 0 ? '+' : ''}${fmt(d!, 1)} %` : 'Q_h oder Q_WP fehlt', []);
  const skala = skalaWpGroesse(fws, d);
  const ampel = skala.ampel;
  const bereich = skala.bereiche.find((b) => b.ampel === ampel && d !== null && d >= b.von - 1e-9 && d <= b.bis + 1e-9);
  let text: string;
  if (d === null) text = 'Q_h oder Q_WP fehlt';
  else if (d >= 0) text = `WP ${fmt(d, 0)} % grösser als der Bedarf — ${bereich?.label ?? ''}`;
  else text = `WP ${fmt(-d, 0)} % kleiner als der Bedarf — ${bereich?.label ?? ''}`;
  return { verhaeltnis, uebergroesse, ampel, text, skala };
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
  const mitWw = (basis: Wert | null): Wert | null =>
    e.wwLadetemperaturC !== undefined && (!basis || e.wwLadetemperaturC > basis.wert)
      ? berechnet(e.wwLadetemperaturC, '°C', `Filter-Vorlauf = WW-Ladetemperatur ${fmt(e.wwLadetemperaturC, 0)} °C (höher als Heizungs-Vorlauf${basis ? ` ${fmt(basis.wert, 1)} °C` : ''})`, [])
      : basis;
  const filterVorlaufStandard = mitWw(e.auslegungsVL);
  let filterVorlauf: Wert | null = null;
  if (e.filter.vorlaufC !== undefined) {
    filterVorlauf = { wert: e.filter.vorlaufC, einheit: '°C', herkunft: 'override', begruendung: `Filter-Vorlauf manuell ${fmt(e.filter.vorlaufC, 0)} °C${e.auslegungsVL ? ` (Auslegungs-VL ${fmt(e.auslegungsVL.wert, 1)} °C)` : ''}` };
    annahmen.push(filterVorlauf);
    if (e.auslegungsVL && e.filter.vorlaufC + 0.5 < e.auslegungsVL.wert) hinweise.push({ stufe: 'warnung', code: 'geraet.filterVorlaufZuTief', text: `Filter-Vorlauf ${fmt(e.filter.vorlaufC, 0)} °C liegt unter der Auslegungs-VL ${fmt(e.auslegungsVL.wert, 1)} °C.`, pfad: 'geraet.filterOverrides.vorlaufC' });
    filterVorlauf = mitWw(filterVorlauf);
  } else filterVorlauf = filterVorlaufStandard;

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
      liste.push({ id: d.id, bezeichnung: geraetBezeichnung(d), qWpW, vorlaufMaxC: d.vorlaufMaxC, verhaeltnis: dim.verhaeltnis.wert, uebergroesseProzent: dim.uebergroesse.wert, ampel: dim.ampel, unplausibel: d.plausibilitaet.unplausibel, preisChf: d.preisChf });
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
      let qWpMassgebend = qWp;
      if (e.qWpAuslegungW !== undefined && e.qWpAuslegungW > 0) {
        qWpMassgebend = eingabe(e.qWpAuslegungW, 'W', `Q_WP am Auslegungspunkt ${fmt(e.qWpAuslegungW / 1000, 2)} kW (Datenblatt, Eingabe; Datenbank A−7/W35: ${fmt(qWpW / 1000, 2)} kW)`);
        if (e.qWpAuslegungW > qWpW * 1.05) gh.push({ stufe: 'warnung', code: 'geraet.auslegungUeberNenn', text: `Leistung am Auslegungspunkt (${fmt(e.qWpAuslegungW / 1000, 1)} kW) liegt über dem Datenbankwert bei A−7/W35 (${fmt(qWpW / 1000, 1)} kW) — Datenblatt prüfen.`, pfad: 'geraet.qWpAuslegungW' });
      } else gh.push({ stufe: 'info', code: 'geraet.kennlinie', text: `${g.hinweise[0] ?? ''} Datenblattwert bei θe und Auslegungs-VL kann eingetragen werden.`, pfad: 'geraet.qWpAuslegungW' });
      const qM = qWpMassgebend.wert;
      let modulation: Modulation | null = null;
      const mod = d.modulationKW;
      if (mod && mod.length === 2 && mod[0]! > 0 && mod[1]! >= mod[0]!) {
        const minW = tabelle(mod[0]! * 1000, 'W', `Untere Modulationsgrenze ${fmt(mod[0]!, 1)} kW (Gerätedatenbank)`, quelleText);
        const maxW = tabelle(mod[1]! * 1000, 'W', `Obere Modulationsgrenze ${fmt(mod[1]!, 1)} kW (Gerätedatenbank)`, quelleText);
        const anteil = qh > 0 ? berechnet(minW.wert / qh, '', `Q_min / Q_h = ${fmt(minW.wert / 1000, 2)} / ${fmt(qh / 1000, 2)} kW = ${fmt((minW.wert / qh) * 100, 0)} %`, [minW]) : null;
        modulation = { minW, maxW, anteilMinAnQh: anteil };
      }
      gewaehlt = { id: d.id, bezeichnung: geraetBezeichnung(d), qWp, qWpMassgebend, vorlaufMax, mindestPuffer, modulation, dimensionierung: dimensionierung(qh, qM, daten.fws), bivalenz: bivalenz(qh, qM, daten.fws), hinweise: gh };
      if (gewaehlt.bivalenz.energieanteil && gewaehlt.bivalenz.energieanteil.herkunft !== 'berechnet') annahmen.push(gewaehlt.bivalenz.energieanteil);
      hinweise.push(...gh);
    }
  }
  return { quelle: e.filter.quelle, filterVorlauf, filterVorlaufStandard, qWpMin: qMin, qWpMax: qMax, liste, gewaehlt, annahmen, hinweise };
}
