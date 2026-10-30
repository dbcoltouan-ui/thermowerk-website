/**
 * Orchestrierung (Session 6; KONTEXT §2 «Eine Quelle der Wahrheit»): `berechne(state, daten) → Ergebnis`
 * ist der EINZIGE Rechenpfad. UI, Dashboard, Bericht, Cloud-KPI, Gerätefilter und Offerte lesen nur das
 * Ergebnis; nichts davon wird in den State zurückgeschrieben (CODE-02/08, FLOW-01/07/09).
 *
 * Ablauf (jede Stufe liest nur Rohangaben + Ergebnisse vorheriger Stufen; irrelevante Angaben laut
 * `relevanz.ts` werden nicht gelesen):
 *   Klima → EBF → Heizlast (FWS bzw. raumweise; Gegenprobe der anderen Methode nur mit echten Daten)
 *   → Plausi → Warmwasser künftig → WW-Speicher → Zuschläge (Q_h) → Wärmeabgabe (Auslegungs-VL)
 *   → Gerät (Filter, Dimensionierung, Bivalenz) → Puffer → MAG/SV
 *   → Annahmen (mit Schritt), Hinweise (mit Schritt), Vollständigkeit, Status je Schritt.
 *
 * Total: fehlende Angaben ergeben `null`-Teilergebnisse und Einträge in `vollstaendigkeit`, nie Exceptions.
 */
import type { Datensatz } from '../daten/index';
import type { HuelleBauteiltyp, SanierungState, State, WwAngaben } from '../state/schema';
import type { FwsEingabe, FwsErgebnis, Sanierung, VerbrauchsEintrag } from './fws';
import { heizlastFws, parseDatum } from './fws';
import type { KonkretesBauteil } from './standardtypen';
import { ALLE_ARTEN, konkretisiereBauteil, standardTypenFuer } from './standardtypen';
import type { ReiheErgebnis } from './verbrauchsreihe';
import { eintragMitHgt, zeitraeumeAusReihe } from './verbrauchsreihe';
import type { GeraetErgebnis } from './geraet';
import { geraetWaehlen } from './geraet';
import type { BauteilArt, Bauteiltyp, HuelleErgebnis, SanierungBauteiltyp } from './huelle';
import { huelleAufloesen } from './huelle';
import type { KlimaErgebnis, StandortEingabe } from './klima';
import { klimaStandort } from './klima';
import type { SpezHeizleistungErgebnis, VergleichErgebnis } from './plausi';
import { spezifischeHeizleistung, vergleichNormVerbrauch } from './plausi';
import type { RaumEingabe, RaumweiseEingabe, RaumweiseErgebnis } from './raumweise';
import { ebfBestimmen, flaecheAus, heizlastRaumweise } from './raumweise';
import type { SchrittId, SchrittStatus } from './relevanz';
import type { Skala } from './skala';
import { skalaVorlauf, skalaWpGroesse } from './skala';
import { heizflaechenVorhanden, SCHRITT_IDS, schrittRelevant } from './relevanz';
import type { MagErgebnis, PufferErgebnis, SicherheitsventilErgebnis, WwSpeicherErgebnis } from './speicher';
import { mag, puffer, sicherheitsventil, wwSpeicher } from './speicher';
import type { Kategorie, WaermeabgabeErgebnis, WaermeabgabeRaumEingabe } from './waermeabgabe';
import { kategorieVon, waermeabgabe } from './waermeabgabe';
import type { LeistungszuschlagErgebnis, WarmwasserEingabe, WarmwasserErgebnis } from './warmwasser';
import { leistungszuschlagWarmwasser, warmwasserBedarf } from './warmwasser';
import type { Hinweis, Wert } from './wert';
import { berechnet, fallback, fmt, istAnnahme } from './wert';
import type { SperrzeitErgebnis } from './zuschlaege';
import { auslegungsleistung, sperrzeitZuschlag, zusatzleistung } from './zuschlaege';

/* ---------------------------------------------------------------------------------------------- */
/* Ergebnis-Typ                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

export interface Annahme {
  wert: Wert<unknown>;
  /** Sprungziel in der Schrittführung. */
  schritt: SchrittId;
}

export interface ErgebnisHinweis extends Hinweis {
  schritt: SchrittId;
}

export interface Fehlend {
  schritt: SchrittId;
  pfad: string;
  text: string;
}

export type HeizlastStatus = 'gemessen' | 'raumweise' | 'schaetzung' | 'fehlt';

export interface HeizlastMassgebend {
  /** Massgebende Heizlast Q_hl [W] — genau eine Quelle mit Herkunft. */
  wert: Wert | null;
  quelle: 'fws' | 'raumweise' | null;
  /** FWS-Methode oder 'raumweise'. */
  art: FwsErgebnis['methode'] | 'raumweise' | null;
  status: HeizlastStatus;
  /** Methode wörtlich für Dashboard/Bericht. */
  label: string;
}

export interface Gegenprobe {
  methode: 'fws' | 'raumweise';
  wert: Wert;
  vergleich: VergleichErgebnis;
}

/** Konkretisierte Raum-Bauteile (Standard-Typ, generische Art/Anschluss aufgelöst) je Raum-id → Bauteil-id. */
export type RaumBauteilKonkret = Record<string, Record<string, KonkretesBauteil>>;

export interface Ergebnis {
  methode: State['methode'];
  klima: KlimaErgebnis | null;
  /** Massgebende Auslegungs-Aussentemperatur (SIA 2028 mit Höhenkorrektur, eigene Angabe oder Standardwert −8 °C). */
  thetaE: Wert;
  /** Energiebezugsfläche (manuell oder aus Räumen) — eine Quelle für beide Modi. */
  ebf: Wert | null;
  heizlast: {
    massgebend: HeizlastMassgebend;
    fws: FwsErgebnis | null;
    raumweise: RaumweiseErgebnis | null;
    huelle: HuelleErgebnis | null;
    gegenprobe: Gegenprobe | null;
    /** Massgebende Heizlast je m² EBF [W/m²]; null ohne EBF. */
    spezifisch: Wert | null;
    /** Abgeleitete Zeiträume je Verbrauchsreihe (Session 7b) — nur FWS mit Rechnungen. */
    verbrauchsreihen: ReiheErgebnis[];
    /** Konkretisierte Raum-Bauteile (Session 7b) — nur raumweise. */
    raumBauteile: RaumBauteilKonkret;
  };
  plausi: { spezifisch: SpezHeizleistungErgebnis | null };
  warmwasser: {
    /** WW bisher über die Heizung (nur Verbrauchsabzug). */
    bisher: WarmwasserErgebnis | null;
    /** WW künftig über die WP. */
    kuenftig: WarmwasserErgebnis | null;
    zuschlag: LeistungszuschlagErgebnis | null;
  };
  zuschlaege: { qhl: Wert | null; qw: Wert; qoff: Wert; qas: Wert; sperrzeit: SperrzeitErgebnis | null; qh: Wert | null };
  waermeabgabe: WaermeabgabeErgebnis | null;
  /** Die EINE Vorlauftemperatur für Gerätefilter, MAG, Bericht (FLOW-01). */
  auslegungsVL: Wert;
  geraet: GeraetErgebnis;
  speicher: {
    ww: WwSpeicherErgebnis | null;
    puffer: PufferErgebnis | null;
    /** Effektives Puffervolumen (Override, Vorschlag oder 0 bei abgewählt) — Dashboard und Bericht lesen nur diesen Wert. */
    pufferEffektiv: Wert;
    mag: MagErgebnis | null;
    sicherheitsventil: SicherheitsventilErgebnis | null;
  };
  /** Ampel-Skalen mit Bereichen und Wert-Marke (Dashboard, Gerätedetail, Bericht zeichnen nur). */
  skalen: {
    /** Auslegungs-VL gegen ≤ 55 / ≤ 65 °C; Wert null, solange die VL nur ein Standardwert ist. */
    vorlauf: Skala;
    /** Übergrösse des gewählten Geräts gegenüber Q_h [%]; Wert null ohne Gerät. */
    wpGroesse: Skala;
  };
  annahmen: Annahme[];
  hinweise: ErgebnisHinweis[];
  vollstaendigkeit: Fehlend[];
  relevanteSchritte: SchrittId[];
  status: Partial<Record<SchrittId, SchrittStatus>>;
}

/* ---------------------------------------------------------------------------------------------- */
/* Hilfen                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

/** Entfernt undefined-Felder (exactOptionalPropertyTypes) — für die Übergabe an Kern-Eingaben. */
function def<T extends object>(o: { [K in keyof T]?: T[K] | undefined }): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
}

function wwEingabe(w: WwAngaben): WarmwasserEingabe {
  const zirk: WarmwasserEingabe['zirkulation'] =
    w.zirkulation === 'rohrAnRohr' || w.zirkulation === 'separat' ? def({ art: w.zirkulation, laengeM: w.zirkulationLaengeM }) : { art: w.zirkulation };
  return def<WarmwasserEingabe>({
    methode: w.methode,
    personen: w.methode === 'personen' ? w.personen : undefined,
    bedarfKey: w.methode === 'personen' ? w.bedarfKey : undefined,
    literProPersonTag: w.methode === 'personen' ? w.literProPersonTag : undefined,
    vwuLiterTag: w.methode === 'direkt' ? w.vwuLiterTag : undefined,
    wohneinheiten: w.methode === 'belegung' ? (w.wohneinheitenAnfM2 ?? []).map((anfM2) => ({ anfM2 })) : undefined,
    speicherVolumenLiter: w.speicherVolumenLiter,
    speicherverlustProzent: w.speicherverlustProzent,
    zirkulation: zirk,
    ausstossProzent: w.ausstossProzent,
  });
}

/** Bauteilarten, auf die eine Massnahme wirkt (fws.json sanierungen.massnahmen[].bauteile; «dach» = alle Dach-/Estrichtypen). */
function artenFuerMassnahme(massnahme: string, daten: Datensatz): BauteilArt[] {
  const m = daten.fws.sanierungen.massnahmen.find((x) => x.key === massnahme);
  const DACH: BauteilArt[] = ['dachSteil', 'dachFlach', 'deckeEstrich'];
  return (m?.bauteile ?? []).flatMap((b) => (b === 'dach' ? DACH : [b as BauteilArt]));
}

function jahrAus(datum: string | undefined): number | undefined {
  const ms = parseDatum(datum);
  return ms === null ? undefined : new Date(ms).getUTCFullYear();
}

/** Sanierung je Bauteiltyp aus der einen Sanierungsliste (raumweise): massgebend ist die späteste wirksame. */
function sanierungFuerTyp(t: HuelleBauteiltyp, liste: SanierungState[], zustand: 'ist' | 'geplant', daten: Datensatz, hinweise: Hinweis[]): SanierungBauteiltyp | undefined {
  const treffer = liste.filter((s) => (s.status === 'ausgefuehrt' || zustand === 'geplant') && (s.bauteiltypIds?.length ? s.bauteiltypIds.includes(t.id) : artenFuerMassnahme(s.massnahme, daten).includes(t.art)));
  if (!treffer.length) return undefined;
  const sortiert = [...treffer].sort((a, b) => (jahrAus(a.datum) ?? 0) - (jahrAus(b.datum) ?? 0) || (a.status === b.status ? 0 : a.status === 'geplant' ? 1 : -1));
  const s = sortiert[sortiert.length - 1]!;
  if (treffer.length > 1) hinweise.push({ stufe: 'info', code: 'sanierung.mehrfach', text: `${t.bezeichnung ?? t.id}: ${treffer.length} Sanierungen — massgebend ist die späteste (${s.bezeichnung ?? s.massnahme}${s.datum ? ' ' + s.datum : ''}).`, pfad: `sanierungen.${s.id}` });
  return def<SanierungBauteiltyp>({ status: s.status, jahr: jahrAus(s.datum), stufen: s.stufen, uOverride: s.uOverride, bezeichnung: s.bezeichnung });
}

function standortEingabe(s: State): StandortEingabe | null {
  const st = s.gebaeude.standort;
  if (!st.plz && !st.kanton && !st.stationOverride && st.thetaEOverrideC === undefined) return null;
  return def<StandortEingabe>({
    plz: st.plz,
    kanton: st.kanton,
    ort: st.ort,
    hoeheM: st.hoeheM,
    stationOverride: st.stationOverride,
    thetaEOverrideC: st.thetaEOverrideC,
    thetaMittelOverrideC: s.methode === 'raumweise' ? st.thetaMittelOverrideC : undefined,
  });
}

function summeRaumflaechen(s: State): number {
  return s.raeume.filter((r) => (r.beheizt ?? true) && (r.inEbf ?? r.beheizt ?? true)).reduce((acc, r) => acc + (flaecheAus(r) ?? 0), 0);
}

function fwsRechnen(s: State, daten: Datensatz, klima: KlimaErgebnis | null, ebf: Wert | null, heute: string, mitAbzug: boolean): { fws: FwsErgebnis | null; wwBisher: WarmwasserErgebnis | null; fehlend: Omit<Fehlend, 'schritt'>[]; reihen: ReiheErgebnis[]; reihenHinweise: Hinweis[] } {
  const v = s.verbrauch;
  const fehlend: Omit<Fehlend, 'schritt'>[] = [];
  const reihen: ReiheErgebnis[] = [];
  const reihenHinweise: Hinweis[] = [];
  const tvoll = def<FwsEingabe['tvoll']>({ bedarfsart: v.bedarfsart, hoeheM: s.gebaeude.standort.hoeheM, override: v.tvollOverride });
  const sanierungen: Sanierung[] = s.sanierungen.map((x) => def<Sanierung>({ id: x.id, massnahme: x.massnahme, einsparungProzent: x.einsparungProzent, bezeichnung: x.bezeichnung, status: x.status, datum: x.datum }));
  let e: FwsEingabe | null = null;
  let wwBisher: WarmwasserErgebnis | null = null;
  if (v.quelle === 'rechnungen') {
    if (!v.reihen.length) fehlend.push({ pfad: 'verbrauch.reihen', text: 'Keine Verbrauchsangaben erfasst' });
    if (v.wwBisher === null) fehlend.push({ pfad: 'verbrauch.wwBisher', text: 'Frage «Enthielt der Verbrauch Warmwasser?» offen' });
    if (v.wwBisher === true && mitAbzug) wwBisher = warmwasserBedarf(wwEingabe(v.abzug), daten.fws);
    // Zeiträume je Reihe ableiten (Lieferungen/Zählerstände/von–bis/Jahr) und Heizgradtage der Station ergänzen.
    const hgtKontext = { stationKey: klima?.station?.key ?? null, hgt: daten.hgt, klima: daten.klima };
    const eintraege: VerbrauchsEintrag[] = [];
    for (const r of v.reihen) {
      const re = zeitraeumeAusReihe(r, `verbrauch.reihen.${r.id}`, daten.fws);
      reihen.push(re);
      reihenHinweise.push(...re.hinweise);
      if (re.fehler) continue;
      for (const z of re.zeitraeume) eintraege.push(eintragMitHgt(z, hgtKontext, reihenHinweise));
    }
    e = def<FwsEingabe>({
      methode: 'verbrauch',
      tvoll,
      sanierungen,
      heute,
      verbrauch: def({
        eintraege,
        eta: v.eta,
        konvention: v.konvention,
        wwAbzug: wwBisher ? { qnWwKwhA: wwBisher.qnWw } : undefined,
        klimabereinigung: v.klimabereinigung ? def({ aktiv: true, hgtNormKd: klima?.hgt?.wert }) : undefined,
      }),
    });
  } else if (v.quelle === 'wpBetriebsstunden') {
    const b = v.wpBetriebsstunden;
    e = def<FwsEingabe>({
      methode: 'wpBetriebsstunden',
      tvoll,
      sanierungen,
      heute,
      wpBetriebsstunden: def({ zaehlerH: b.zaehlerH ?? 0, betriebsjahre: b.betriebsjahre ?? 0, qWpW: b.qWpW, stromKwhA: b.stromKwhA, cop: b.cop, zeitraum: b.von && b.bis ? { von: b.von, bis: b.bis } : undefined, erdsondeLaengeM: b.erdsondeLaengeM }),
    });
  } else if (v.quelle === 'messung') {
    if (v.messung.qnHeizungKwhA === undefined) fehlend.push({ pfad: 'verbrauch.messung.qnHeizungKwhA', text: 'Wärmezähler-Wert fehlt' });
    e = def<FwsEingabe>({ methode: 'messung', tvoll, sanierungen, heute, messung: def({ qnHeizungKwhA: v.messung.qnHeizungKwhA ?? 0, zeitraum: v.messung.von && v.messung.bis ? { von: v.messung.von, bis: v.messung.bis } : undefined }) });
  } else {
    if (v.quelle === null) fehlend.push({ pfad: 'verbrauch.quelle', text: 'Frage «Verbrauchsdaten vorhanden?» offen' });
    const g = s.gebaeude;
    if (ebf && g.typ && g.baujahr !== undefined) {
      e = { methode: 'bauperiode', tvoll, sanierungen, heute, bauperiode: { ebfM2: ebf.wert, gebaeudetyp: g.typ, baujahr: g.baujahr } };
    }
  }
  const fws = e ? heizlastFws(e, daten.fws) : null;
  if (fws && reihen.some((r) => r.fehler)) {
    // Fehler in einer Reihe: keine Heizlast (wie Überlappung in fws.ts)
    return { fws: { ...fws, qhl: null, qhlIst: null, qhlKorr: null, qhlUnsaniert: null, vollstaendig: false }, wwBisher, fehlend, reihen, reihenHinweise };
  }
  return { fws, wwBisher, fehlend, reihen, reihenHinweise };
}

/**
 * Auslegungs-Aussentemperatur: SIA-2028-Station (mit Höhenkorrektur) bzw. eigene Angabe, sobald vorhanden;
 * sonst Standardwert −8 °C (klimastationen.json `standardThetaE`), sichtbar als Annahme und überschreibbar.
 */
export function thetaEAuslegung(klima: KlimaErgebnis | null, daten: Datensatz): { thetaE: Wert; hinweise: Hinweis[] } {
  if (klima?.thetaE) return { thetaE: klima.thetaE, hinweise: [] };
  const t = daten.klima.standardThetaE.thetaEC;
  const thetaE = fallback(t, '°C', `θe ${fmt(t, 0)} °C — Standardwert, solange kein Standort mit Klimastation erfasst ist (überschreibbar)`, { stufe: 'standardwert', quelle: 'klimastationen.json standardThetaE' });
  return { thetaE, hinweise: [{ stufe: 'info', code: 'klima.standardwert', text: `Kein Standort erfasst — Auslegungs-Aussentemperatur ${fmt(t, 0)} °C als Standardwert.`, pfad: 'gebaeude.standort' }] };
}

/** Bauteilarten, die der Rest (Hüllflächen) ohne eigenen Typ braucht. */
function restArten(s: State): BauteilArt[] {
  const r = s.huelle.rest;
  if (r.modus !== 'huellflaechen') return [];
  const out: BauteilArt[] = [];
  if ((r.aAussenwandM2 ?? 0) > 0) out.push('aussenwand');
  if ((r.aFensterM2 ?? 0) > 0) out.push('fenster');
  if ((r.aTuerM2 ?? 0) > 0) out.push('tuer');
  if ((r.aDachM2 ?? 0) > 0) out.push((s.gebaeude.dachform ?? 'steil') === 'flach' ? 'dachFlach' : 'dachSteil');
  if ((r.aDeckeEstrichM2 ?? 0) > 0) out.push('deckeEstrich');
  if ((r.aBodenM2 ?? 0) > 0) out.push(r.bodenAnschluss === 'erdreich' ? 'bodenErdreich' : 'bodenKeller');
  return out;
}

/**
 * Räume konkretisieren (Session 7b): generische Art/Anschluss aus dem Gebäude, Standard-Typ ohne eigenen Typ.
 * Liefert die Kern-Räume und die Liste der benötigten Standard-Arten.
 */
function raeumeKonkret(s: State): { raeume: RaumEingabe[]; konkret: RaumBauteilKonkret; stdArten: Set<BauteilArt>; stdGenutzt: Set<BauteilArt> } {
  const g = { keller: s.gebaeude.keller, dachform: s.gebaeude.dachform, dachraumBeheizt: s.gebaeude.dachraumBeheizt };
  const eigene = s.huelle.bauteiltypen;
  const eigeneArten = new Set(eigene.map((t) => t.art));
  const konkret: RaumBauteilKonkret = {};
  const stdArten = new Set<BauteilArt>();
  // Standard-Typen, deren U wirklich vererbt wird (kein eigener U-Wert am Raum-Bauteil) → nur diese sind Annahmen.
  const stdGenutzt = new Set<BauteilArt>();
  const raeume: RaumEingabe[] = s.raeume.map((r) => {
    const map: Record<string, KonkretesBauteil> = {};
    const bauteile = r.bauteile.map((b) => {
      const k = konkretisiereBauteil(b, g, eigene);
      map[b.id] = k;
      if (k.standardTyp && k.art) {
        stdArten.add(k.art);
        if (k.uOverride === undefined) stdGenutzt.add(k.art);
      }
      const { standardTyp: _s, ausGebaeude: _a, ...kern } = k;
      return kern;
    });
    konkret[r.id] = map;
    return { ...r, bauteile };
  });
  for (const a of restArten(s)) {
    if (eigeneArten.has(a)) continue;
    stdArten.add(a);
    stdGenutzt.add(a);
  }
  return { raeume, konkret, stdArten, stdGenutzt };
}

function raumweiseRechnen(s: State, daten: Datensatz, klima: KlimaErgebnis | null, thetaE: Wert | null, hinweise: Hinweis[]): { huelle: HuelleErgebnis | null; raumweise: RaumweiseErgebnis | null; fehlend: Omit<Fehlend, 'schritt'>[]; raumBauteile: RaumBauteilKonkret } {
  const fehlend: Omit<Fehlend, 'schritt'>[] = [];
  const g = s.gebaeude;
  if (g.baujahr === undefined) return { huelle: null, raumweise: null, fehlend, raumBauteile: {} };
  const zustand: 'ist' | 'geplant' = s.sanierungen.some((x) => x.status === 'geplant') ? 'geplant' : 'ist';
  const rk = raeumeKonkret(s);
  // Eigene Typen zuerst (gewinnen in Rest-Lookups), dann die Standard-Typen der benötigten Arten.
  const standard = standardTypenFuer([...ALLE_ARTEN].filter((a) => rk.stdArten.has(a)), daten.huelle).map((t) => ({ id: t.id, art: t.art, bezeichnung: t.bezeichnung! }));
  const bauteiltypen: Bauteiltyp[] = [...s.huelle.bauteiltypen, ...standard].map((t) => def<Bauteiltyp>({ ...t, sanierung: sanierungFuerTyp(t, s.sanierungen, zustand, daten, hinweise) }));
  const huelle = huelleAufloesen({ baujahr: g.baujahr, bauteiltypen, zustand }, daten.huelle);
  for (const t of standard) {
    const b = huelle.bauteile[t.id];
    if (!b) continue;
    if (b.u.herkunft !== 'override') {
      const neu = { ...b.u, begruendung: `Standard aus Baujahr ${g.baujahr}: ${b.u.begruendung.replace(/^geschätzt aus Baujahr \d+ /, '')}` };
      huelle.annahmen = huelle.annahmen.map((a) => (a === b.u ? neu : a));
      b.u = neu;
    }
    // U eines Standard-Typs ist nur eine Annahme, wenn es irgendwo vererbt wird (kein eigener U-Wert am Bauteil).
    if (!rk.stdGenutzt.has(t.art)) huelle.annahmen = huelle.annahmen.filter((a) => a !== b.u);
  }
  if (!s.raeume.length) fehlend.push({ pfad: 'raeume', text: 'Keine Räume erfasst' });
  if (!thetaE) return { huelle, raumweise: null, fehlend, raumBauteile: rk.konkret };
  const h = s.huelle;
  const e = def<RaumweiseEingabe>({
    thetaE,
    thetaMittelJahr: klima?.thetaMittelJahr ?? undefined,
    huelle,
    baujahr: g.baujahr,
    gebaeudetyp: g.typ ?? undefined,
    lueftung: h.lueftung,
    waermebruecken: h.waermebruecken,
    erdreich: h.erdreich,
    geschosshoeheM: h.geschosshoeheM,
    raeume: rk.raeume,
    ebf: def({ modus: g.ebfModus, manuellM2: g.ebfModus === 'manuell' ? g.ebfManuellM2 : undefined }),
    rest: s.raeume.length ? h.rest : undefined,
  });
  return { huelle, raumweise: heizlastRaumweise(e, { sia: daten.sia, fws: daten.fws }), fehlend, raumBauteile: rk.konkret };
}

function heizflaechenArt(kats: Set<Kategorie>): { puffer: 'fbh' | 'heizkoerper' | 'gemischt'; mag: 'konvektoren' | 'plattenheizkoerper' | 'radiatoren' | 'fbh' | 'gemischt' } {
  const nurFlaeche = [...kats].every((k) => k === 'flaeche');
  const keineFlaeche = !kats.has('flaeche');
  const pufferArt = nurFlaeche ? 'fbh' : keineFlaeche ? 'heizkoerper' : 'gemischt';
  let magArt: 'konvektoren' | 'plattenheizkoerper' | 'radiatoren' | 'fbh' | 'gemischt' = 'gemischt';
  if (kats.size === 1) {
    const k = [...kats][0];
    magArt = k === 'flaeche' ? 'fbh' : k === 'platte' || k === 'vertikal' || k === 'bad' ? 'plattenheizkoerper' : k === 'konvektor' ? 'konvektoren' : 'radiatoren';
  }
  return { puffer: pufferArt, mag: magArt };
}

/* ---------------------------------------------------------------------------------------------- */
/* berechne                                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export function berechne(s: State, daten: Datensatz): Ergebnis {
  const annahmen: Annahme[] = [];
  const hinweise: ErgebnisHinweis[] = [];
  const vollstaendigkeit: Fehlend[] = [];
  const gesehen = new Set<Wert<unknown>>();
  const annahme = (schritt: SchrittId, werte: ReadonlyArray<Wert<unknown> | null | undefined>) => {
    for (const w of werte) {
      if (!w || gesehen.has(w) || !istAnnahme(w)) continue;
      gesehen.add(w);
      annahmen.push({ wert: w, schritt });
    }
  };
  const hinweisSchluessel = new Set<string>();
  const hinweis = (schritt: SchrittId, hs: ReadonlyArray<Hinweis>) => {
    for (const x of hs) {
      const k = `${schritt}|${x.code}|${x.pfad ?? ''}|${x.text}`;
      if (hinweisSchluessel.has(k)) continue;
      hinweisSchluessel.add(k);
      hinweise.push({ ...x, schritt });
    }
  };
  const fehlt = (schritt: SchrittId, pfad: string, text: string) => vollstaendigkeit.push({ schritt, pfad, text });
  const heute = s.projekt.bezugsdatum ?? s.meta.geaendert.slice(0, 10);

  // Schritt 0
  if (!s.methode) fehlt('projekt', 'methode', 'Methode wählen (FWS-Kurs oder raumweise)');
  if (!s.projekt.name.trim()) fehlt('projekt', 'projekt.name', 'Projektname fehlt');

  // Schritt 1: Gebäude, Klima, EBF
  const g = s.gebaeude;
  if (g.baujahr === undefined) fehlt('gebaeude', 'gebaeude.baujahr', 'Baujahr fehlt');
  if (!g.typ) fehlt('gebaeude', 'gebaeude.typ', 'Gebäudetyp (EFH/MFH) fehlt');
  const standort = standortEingabe(s);
  const klima = standort ? klimaStandort(standort, daten.klima) : null;
  if (klima) {
    hinweis('gebaeude', klima.hinweise);
    annahme('gebaeude', klima.annahmen);
  }
  const te = thetaEAuslegung(klima, daten);
  const thetaE = te.thetaE;
  hinweis('gebaeude', te.hinweise);
  annahme('gebaeude', [thetaE]);
  const ebfR = ebfBestimmen({ modus: g.ebfModus, manuellM2: g.ebfModus === 'manuell' ? g.ebfManuellM2 : undefined }, summeRaumflaechen(s), daten.fws);
  const ebf = ebfR.ebf;
  hinweis('gebaeude', ebfR.hinweise.map((x) => ({ ...x, pfad: 'gebaeude.ebfManuellM2' })));
  if (!ebf) fehlt('gebaeude', g.ebfModus === 'manuell' ? 'gebaeude.ebfManuellM2' : 'raeume', g.ebfModus === 'manuell' ? 'EBF fehlt' : 'EBF: keine Räume mit Fläche erfasst');
  annahme('gebaeude', [ebf]);

  // Schritt 2–4: Heizlast
  let fws: FwsErgebnis | null = null;
  let raumweise: RaumweiseErgebnis | null = null;
  let huelle: HuelleErgebnis | null = null;
  let wwBisher: WarmwasserErgebnis | null = null;
  let gegenprobe: Gegenprobe | null = null;
  let verbrauchsreihen: ReiheErgebnis[] = [];
  let raumBauteile: RaumBauteilKonkret = {};
  let massgebend: HeizlastMassgebend = { wert: null, quelle: null, art: null, status: 'fehlt', label: 'Methode wählen' };

  if (s.methode === 'fws') {
    const r = fwsRechnen(s, daten, klima, ebf, heute, true);
    fws = r.fws;
    wwBisher = r.wwBisher;
    verbrauchsreihen = r.reihen;
    hinweis('verbrauch', r.reihenHinweise);
    r.fehlend.forEach((f) => fehlt('verbrauch', f.pfad, f.text));
    if (!fws && s.verbrauch.quelle !== 'rechnungen' && s.verbrauch.quelle !== 'wpBetriebsstunden' && s.verbrauch.quelle !== 'messung') fehlt('verbrauch', 'verbrauch.quelle', 'Ohne Verbrauch: für die Bauperioden-Schätzung fehlen EBF, Gebäudetyp oder Baujahr');
    if (fws) {
      hinweis('verbrauch', fws.hinweise.filter((x) => !x.code.startsWith('sanierung')));
      hinweis('sanierungen', fws.hinweise.filter((x) => x.code.startsWith('sanierung')));
      annahme('sanierungen', [...fws.sanierungen.ausgefuehrt, ...fws.sanierungen.geplant].map((x) => x.einsparung));
      annahme('verbrauch', fws.annahmen);
      if (fws.qhl) {
        const status: HeizlastStatus = fws.methode === 'bauperiode' ? 'schaetzung' : 'gemessen';
        const konv = s.verbrauch.quelle === 'rechnungen' ? (s.verbrauch.konvention === 'hi' ? ' (Hi, BFE)' : ' (FWS-Kurs, Ho 10.5/10.4, Kurs-η)') : '';
        massgebend = { wert: fws.qhl, quelle: 'fws', art: fws.methode, status, label: `FWS-Kurs Modul 3 — ${fws.methodeLabel}${konv}` };
      } else massgebend = { wert: null, quelle: 'fws', art: fws.methode, status: 'fehlt', label: `FWS-Kurs Modul 3 — ${fws.methodeLabel}` };
    }
    if (wwBisher) {
      hinweis('verbrauch', wwBisher.hinweise);
      annahme('verbrauch', wwBisher.annahmen);
    }
    // Gegenprobe raumweise nur mit echten Raum-Bauteilen
    if (fws?.qhl && s.raeume.some((x) => x.bauteile.length > 0)) {
      const rw = raumweiseRechnen(s, daten, klima, thetaE, []);
      if (rw.raumweise?.vollstaendig) gegenprobe = { methode: 'raumweise', wert: rw.raumweise.gebaeude, vergleich: vergleichNormVerbrauch(rw.raumweise.gebaeude, fws.qhl, daten.fws) };
    }
  } else if (s.methode === 'raumweise') {
    const hh: Hinweis[] = [];
    const r = raumweiseRechnen(s, daten, klima, thetaE, hh);
    hinweis('sanierungen', hh);
    huelle = r.huelle;
    raumweise = r.raumweise;
    raumBauteile = r.raumBauteile;
    r.fehlend.forEach((f) => fehlt('huelle', f.pfad, f.text));
    if (!huelle) fehlt('huelle', 'gebaeude.baujahr', 'Für die Hülle fehlt das Baujahr');
    if (huelle) {
      hinweis('huelle', huelle.hinweise);
      annahme('huelle', huelle.annahmen);
    }
    if (raumweise) {
      hinweis('huelle', raumweise.hinweise.filter((x) => !x.code.startsWith('ebf.')));
      annahme('huelle', raumweise.annahmen.filter((a) => a !== raumweise?.thetaE && a !== raumweise?.ebf));
      if (raumweise.raeume.length) massgebend = { wert: raumweise.gebaeude, quelle: 'raumweise', art: 'raumweise', status: raumweise.vollstaendig ? 'raumweise' : 'fehlt', label: raumweise.methode };
      else massgebend = { wert: null, quelle: 'raumweise', art: 'raumweise', status: 'fehlt', label: raumweise.methode };
    }
    // Gegenprobe FWS nur mit echten Verbrauchsrechnungen
    if (raumweise?.vollstaendig && raumweise.raeume.length && s.verbrauch.quelle === 'rechnungen' && s.verbrauch.reihen.length) {
      const fr = fwsRechnen(s, daten, klima, ebf, heute, s.verbrauch.wwBisher === true);
      if (fr.fws?.qhl) gegenprobe = { methode: 'fws', wert: fr.fws.qhl, vergleich: vergleichNormVerbrauch(raumweise.gebaeude, fr.fws.qhl, daten.fws) };
    }
  }
  const qhl = massgebend.wert;
  const spezHeizlast = qhl && ebf && ebf.wert > 0 ? berechnet(qhl.wert / ebf.wert, 'W/m²', `Q_hl ${fmt(qhl.wert, 0)} W / EBF ${fmt(ebf.wert, 0)} m² = ${fmt(qhl.wert / ebf.wert, 1)} W/m²`, [qhl, ebf]) : null;

  // Plausi: spezifische Heizleistung gegen Bauperioden-/Minergie-Band (unsanierter Zustand)
  let spezifisch: SpezHeizleistungErgebnis | null = null;
  const qhlUnsaniert = fws?.qhlUnsaniert ?? (raumweise && raumweise.raeume.length ? raumweise.gebaeude : null);
  if (qhlUnsaniert && ebf && g.baujahr !== undefined && g.typ) {
    spezifisch = spezifischeHeizleistung({ qhlUnsaniertW: qhlUnsaniert, ebfM2: ebf, baujahr: g.baujahr, gebaeudetyp: g.typ, energiestandard: g.energiestandard, saniert: s.sanierungen.some((x) => x.status === 'ausgefuehrt') }, daten.fws);
    hinweis('heizlast', spezifisch.hinweise);
  }

  // Schritt 5: Warmwasser künftig
  const w = s.warmwasser;
  if (w.wwKuenftig === null) fehlt('warmwasser', 'warmwasser.wwKuenftig', 'Frage «Bereitet die neue WP Warmwasser?» offen');
  let wwKuenftig: WarmwasserErgebnis | null = null;
  let zuschlagWw: LeistungszuschlagErgebnis | null = null;
  let wwSp: WwSpeicherErgebnis | null = null;
  if (w.wwKuenftig === true) {
    const ein = wwEingabe(w);
    if (s.speicher.ww.volumenOverrideLiter !== undefined && ein.speicherVolumenLiter === undefined) ein.speicherVolumenLiter = s.speicher.ww.volumenOverrideLiter;
    wwKuenftig = warmwasserBedarf(ein, daten.fws);
    hinweis('warmwasser', wwKuenftig.hinweise);
    annahme('warmwasser', wwKuenftig.annahmen);
    if (qhl) {
      zuschlagWw = leistungszuschlagWarmwasser(qhl, wwKuenftig.qww, daten.fws);
      hinweis('warmwasser', zuschlagWw.hinweise);
    }
    wwSp = wwSpeicher(def({ qwwKwhTag: wwKuenftig.qww, vwuLiterTag: wwKuenftig.vwu, tLadeC: w.tLadeC, fStoKey: w.fStoKey, gebaeudetyp: g.typ ?? undefined, volumenOverrideLiter: s.speicher.ww.volumenOverrideLiter }), daten.fws);
    hinweis('speicher', wwSp.hinweise);
    annahme('speicher', wwSp.annahmen);
  }

  // Schritt 7: Zuschläge und Auslegungsleistung
  const z = s.zuschlaege;
  if (z.sperrzeitAktiv === null) fehlt('zuschlaege', 'zuschlaege.sperrzeitAktiv', 'Frage «EVU-Sperrzeit vorhanden?» offen');
  if (z.sperrzeitAktiv === true && z.sperrzeitH === undefined) fehlt('zuschlaege', 'zuschlaege.sperrzeitH', 'Sperrzeit (h/d) fehlt');
  const toff = z.sperrzeitAktiv === true ? (z.sperrzeitH ?? 0) : 0;
  const sperrzeit = qhl ? sperrzeitZuschlag(qhl, toff, daten.fws) : null;
  if (sperrzeit) hinweis('zuschlaege', sperrzeit.hinweise);
  const qas = zusatzleistung(z.zusatz);
  const qw: Wert = zuschlagWw?.qw ?? berechnet(0, 'W', w.wwKuenftig === true ? 'Q_w nicht berechenbar (Heizlast fehlt)' : 'Kein Warmwasser über die WP: Q_w = 0', []);
  const qoff: Wert = sperrzeit?.qoff ?? berechnet(0, 'W', 'Q_off = 0', []);
  const qh = qhl ? auslegungsleistung({ qhl, qw, qoff, qas }) : null;

  // Schritt 6: Wärmeabgabe → Auslegungs-VL
  const wa = s.waermeabgabe;
  const raumIds = new Set(s.raeume.map((r) => r.id));
  for (const rid of Object.keys(wa.raeume)) if (!raumIds.has(rid) && (wa.raeume[rid]?.heizflaechen.length ?? 0) > 0) hinweis('waermeabgabe', [{ stufe: 'warnung', code: 'waermeabgabe.raumFehlt', text: `Heizflächen zu einem gelöschten Raum («${rid}») werden ignoriert.`, pfad: `waermeabgabe.raeume.${rid}` }]);
  let wab: WaermeabgabeErgebnis | null = null;
  const hfDa = heizflaechenVorhanden(s);
  // FWS: Räume gibt es nur für die Heizflächen — die verteilte Raumheizlast ist schon vor der ersten Heizfläche sichtbar (Session 8).
  if (hfDa || wa.auslegungsVLOverrideC !== undefined || wa.heizkreise.some((k) => k.tVLC !== undefined) || (s.methode === 'fws' && s.raeume.length > 0)) {
    const rwRaeume = new Map((raumweise?.raeume ?? []).map((r) => [r.id, r]));
    const raeume: WaermeabgabeRaumEingabe[] = s.raeume.map((r) => {
      const st = wa.raeume[r.id];
      const rr = rwRaeume.get(r.id);
      return def<WaermeabgabeRaumEingabe>({
        id: r.id,
        name: r.name,
        typ: r.typ,
        thetaIntC: r.thetaIntC,
        thetaInt: rr?.thetaInt,
        flaecheM2: flaecheAus(r) ?? undefined,
        phiHL: rr?.phiHL,
        phiHLManuellW: s.methode === 'fws' ? st?.phiHLManuellW : undefined,
        beheizt: r.beheizt,
        ausklammern: st?.ausklammern,
        ausklammernGrund: st?.ausklammernGrund,
        heizflaechen: st?.heizflaechen ?? [],
      });
    });
    wab = waermeabgabe(
      def({
        heizkreise: wa.heizkreise,
        raeume,
        zielVLC: hfDa ? wa.zielVLC : undefined,
        verteilung: s.methode === 'fws' && qhl ? def({ qhl, ebfM2: ebf?.wert }) : undefined,
        heizkurveAlt: hfDa && wa.heizkurveAlt?.tVLC !== undefined ? def({ tVLC: wa.heizkurveAlt.tVLC, tRLC: wa.heizkurveAlt.tRLC }) : undefined,
        auslegungsVLOverrideC: wa.auslegungsVLOverrideC,
      }),
      { hk: daten.hk, fws: daten.fws, sia: daten.sia },
    );
    hinweis('waermeabgabe', wab.hinweise); // enthält bereits die Raum- und Heizflächen-Hinweise
    annahme('waermeabgabe', wab.annahmen);
  }
  const sys = wa.system;
  const SYSTEM_TEXT = { fbh: 'Fussbodenheizung', radiatoren: 'Radiatoren', gemischt: 'Radiatoren und Fussbodenheizung' } as const;
  const vlStandard = sys ? daten.hk.auslegung.standardVLJeSystemC[sys] : daten.hk.auslegung.zielVLDefaultC;
  const auslegungsVL: Wert =
    wab?.gebaeude.auslegungsVL ??
    fallback(vlStandard, '°C', sys ? `Keine Heizflächen bewertet — Auslegungs-VL ${fmt(vlStandard, 0)} °C für ${SYSTEM_TEXT[sys]} (Standardwert, überschreibbar)` : `Keine Heizflächen bewertet, System nicht gewählt — Auslegungs-VL ${fmt(vlStandard, 0)} °C als Standardwert (Grenze «gut» der WP-Tauglichkeit)`, { stufe: 'standardwert', quelle: 'heizkoerper-tabellen.json auslegung.standardVLJeSystemC (Thermowerk-Annahme)' });
  annahme('waermeabgabe', [auslegungsVL]);

  // Schritt 9: Gerät
  const ge = s.geraet;
  const geraet = geraetWaehlen(
    {
      qh,
      auslegungsVL,
      wwLadetemperaturC: w.wwKuenftig === true ? wwSp?.tLade.wert : undefined,
      filter: def({ quelle: ge.quelle, ...ge.filterOverrides }),
      auswahlId: ge.auswahlId,
      qWpAuslegungW: ge.qWpAuslegungW,
    },
    { fws: daten.fws, wp: daten.wp },
  );
  hinweis('waermepumpe', geraet.hinweise);
  annahme('waermepumpe', geraet.annahmen);
  if (!ge.auswahlId) fehlt('waermepumpe', 'geraet.auswahlId', 'Kein Gerät gewählt');

  // Schritt 8: Puffer, MAG, Sicherheitsventil
  const kats = new Set<Kategorie>();
  for (const r of s.raeume) for (const hf of wa.raeume[r.id]?.heizflaechen ?? []) kats.add(kategorieVon(hf.bauart, daten.hk));
  const sp = s.speicher.puffer;
  let pufferHeizflaechen: 'fbh' | 'heizkoerper' | 'gemischt';
  let magArt: 'konvektoren' | 'plattenheizkoerper' | 'radiatoren' | 'fbh' | 'gemischt' = 'gemischt';
  if (kats.size) {
    const a = heizflaechenArt(kats);
    pufferHeizflaechen = a.puffer;
    magArt = a.mag;
  } else if (sys) {
    pufferHeizflaechen = sys === 'radiatoren' ? 'heizkoerper' : sys;
    magArt = sys;
  } else {
    pufferHeizflaechen = 'heizkoerper';
    annahme('speicher', [fallback<string>('heizkoerper', '', 'Heizflächenart für Puffer-Kriterium: Heizkörper (Standardwert, keine Heizflächen erfasst)', { stufe: 'standardwert' })]);
  }
  const err = sp.einzelraumregelung ?? false;
  if (sp.einzelraumregelung === null && sp.aktiv !== false) annahme('speicher', [fallback<boolean>(false, '', 'Einzelraumregelung: nein (Standardwert)', { stufe: 'standardwert' })]);
  let pufferErg: PufferErgebnis | null = null;
  let pufferEffektiv: Wert;
  pufferErg = puffer(
    def({
      quelle: ge.quelle,
      qWpW: geraet.gewaehlt?.qWp,
      qhlW: qhl ?? undefined,
      heizflaechen: pufferHeizflaechen,
      einzelraumregelung: err,
      herstellerMinimumLiter: geraet.gewaehlt?.mindestPuffer?.wert,
      sperrzeitUeberbrueckung: sp.sperrzeitUeberbrueckung && z.sperrzeitAktiv === true,
      sperrzeitH: toff,
      volumenOverrideLiter: sp.aktiv === false ? undefined : sp.volumenOverrideLiter,
    }),
    daten.fws,
  );
  if (sp.aktiv === false) {
    pufferEffektiv = berechnet(0, 'l', `Kein Puffer (bewusst abgewählt; Vorschlag wäre ${fmt(pufferErg.volumenEffektiv.wert, 0)} l)`, []);
    if (pufferErg.volumenEffektiv.wert > 0) hinweis('speicher', [{ stufe: 'warnung', code: 'puffer.abgewaehlt', text: `Puffer abgewählt, obwohl ${pufferErg.massgebend === 'hersteller' ? 'der Hersteller' : 'das Kriterium'} ${fmt(pufferErg.volumen.wert, 0)} l verlangt.`, pfad: 'speicher.puffer.aktiv' }]);
  } else {
    pufferEffektiv = pufferErg.volumenEffektiv;
    hinweis('speicher', pufferErg.hinweise);
    annahme('speicher', pufferErg.annahmen);
  }
  let magErg: MagErgebnis | null = null;
  let sv: SicherheitsventilErgebnis | null = null;
  if (qh || s.speicher.mag.anlagenvolumenLiter !== undefined) {
    magErg = mag(
      def({
        anlagenvolumenLiter: s.speicher.mag.anlagenvolumenLiter,
        qhW: qh ?? undefined,
        heizflaechen: magArt,
        pufferLiter: pufferEffektiv.wert,
        tVlMaxC: auslegungsVL.wert,
        p0Bar: s.speicher.mag.p0Bar,
        pSvBar: s.speicher.mag.pSvBar,
      }),
      daten.hydraulik,
    );
    hinweis('speicher', magErg.hinweise);
    annahme('speicher', magErg.annahmen);
  }
  const abblase = geraet.gewaehlt?.qWp.wert ?? qh?.wert;
  if (abblase && abblase > 0) sv = sicherheitsventil(abblase, daten.hydraulik);

  // Status je Schritt
  const relevanteSchritte = SCHRITT_IDS.filter((id) => schrittRelevant(id, s));
  const status: Partial<Record<SchrittId, SchrittStatus>> = {};
  for (const id of relevanteSchritte) {
    if (id === 'bericht') continue;
    const offen = vollstaendigkeit.some((f) => f.schritt === id) || hinweise.some((x) => x.schritt === id && x.stufe === 'fehler');
    const warn = hinweise.some((x) => x.schritt === id && x.stufe === 'warnung');
    const ann = annahmen.some((a) => a.schritt === id);
    status[id] = offen ? 'offen' : warn ? 'warnung' : ann ? 'annahmen' : 'vollstaendig';
  }
  if (status.heizlast !== undefined) status.heizlast = massgebend.status === 'fehlt' ? 'offen' : spezifisch?.ampel === 'rot' || status.heizlast === 'warnung' ? 'warnung' : massgebend.status === 'schaetzung' || (massgebend.wert && istAnnahme(massgebend.wert)) ? 'annahmen' : status.heizlast;
  status.bericht = vollstaendigkeit.length ? 'offen' : hinweise.some((x) => x.stufe === 'warnung' || x.stufe === 'fehler') ? 'warnung' : annahmen.length ? 'annahmen' : 'vollstaendig';

  return {
    methode: s.methode,
    klima,
    thetaE,
    ebf,
    heizlast: { massgebend, fws, raumweise, huelle, gegenprobe, spezifisch: spezHeizlast, verbrauchsreihen, raumBauteile },
    plausi: { spezifisch },
    warmwasser: { bisher: wwBisher, kuenftig: wwKuenftig, zuschlag: zuschlagWw },
    zuschlaege: { qhl, qw, qoff, qas, sperrzeit, qh },
    waermeabgabe: wab,
    auslegungsVL,
    geraet,
    speicher: { ww: wwSp, puffer: pufferErg, pufferEffektiv, mag: magErg, sicherheitsventil: sv },
    skalen: {
      vorlauf: skalaVorlauf(daten.hk, auslegungsVL.herkunft === 'fallback' ? null : auslegungsVL.wert),
      wpGroesse: geraet.gewaehlt ? geraet.gewaehlt.dimensionierung.skala : skalaWpGroesse(daten.fws, null),
    },
    annahmen,
    hinweise,
    vollstaendigkeit,
    relevanteSchritte,
    status,
  };
}
