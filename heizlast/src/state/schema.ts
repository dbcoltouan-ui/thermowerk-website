/**
 * State-Schema v2 (Session 6; KONTEXT §2 «State», «Eine Quelle der Wahrheit»).
 *
 * Der State enthält NUR Rohangaben des Nutzers. Abgeleitete Werte (U-Werte, Q_N, EBF aus Räumen,
 * θe, Heizlasten, Speichervolumen …) entstehen ausschliesslich in `berechne(state, daten)` und werden
 * nie zurückgeschrieben (CODE-08, FLOW-15). Fehlende Angaben sind `undefined`/`null`, nie 0 oder ''.
 *
 * Konventionen:
 *  - Listen mit Objekten tragen eine stabile `id` (vom Store vergeben, nie vom Nutzer editierbar, FLOW-18).
 *  - Pfade für Setter, Relevanz und Hinweise: Punkt-getrennt, Listenelemente über ihre id
 *    (`raeume.r2.bauteile.b1.flaecheM2`, `waermeabgabe.raeume.r2.heizflaechen.hf1.laengeM`).
 *  - Ja/Nein-Fragen sind `boolean | null` (null = noch nicht beantwortet → Vollständigkeit).
 *  - Einheiten wie im Kern (W, °C, K, l, m², m, mm bei Heizkörper-Massen); Formatierung nur in der UI.
 *
 * `normalisiereState(raw)` ist die Validierung: unbekannte Schlüssel fallen weg, falsche Typen werden
 * verworfen und protokolliert (`probleme`), Pflichtteile bekommen Standardwerte. Sie läuft beim Laden
 * (hydrate.ts), nicht bei jedem Tastendruck.
 */
import type { Bedarfsart, EtaAngabe, Massnahme } from '../kern/fws';
import type { Ablesung, Erfassungsart, Lieferung, VerbrauchsReihe, Zaehlerstand, ZeitraumEintrag } from '../kern/verbrauchsreihe';
import { ENERGIETRAEGER } from '../kern/typen';
import type { Energietraeger, Gebaeudetyp, Konvention, WpQuelle } from '../kern/typen';
import type { BauteilArt, Stufen } from '../kern/huelle';
import type { Anschluss, RaumBauteilEingabe, RaumEingabe, RestEingabe } from '../kern/raumweise';
import type { AnschlussAuto, RaumBauteilArtGenerisch } from '../kern/standardtypen';
import type { HeizflaecheEingabe, HeizkreisEingabe } from '../kern/waermeabgabe';
import { BAUARTEN } from '../kern/waermeabgabe';
import type { Zusatzverbraucher } from '../kern/zuschlaege';
import type { Energiestandard } from '../kern/plausi';
import type { Dichtheit, Lueftungskonzept } from '../daten/sia384';

export const SCHEMA_VERSION = 3 as const;

export type Methode = 'fws' | 'raumweise';
/** Woher die FWS-Heizlast kommt (Schritt 3A «Verbrauchsdaten vorhanden?»). */
export type VerbrauchsQuelle = 'rechnungen' | 'wpBetriebsstunden' | 'messung' | 'keine';
export type ZirkulationsArt = 'keine' | 'rohrAnRohr' | 'separat' | 'unbekannt' | 'warmhalteband';

/** Warmwasser-Angaben (gleiches Schema für «bisher» = Verbrauchsabzug und «künftig» = neue WP; zwei getrennte Äste, UX-11/13). */
export interface WwAngaben {
  methode: 'personen' | 'direkt' | 'belegung';
  personen?: number;
  /** Schlüssel aus fws.json warmwasser.bedarfProPersonLiterTag (Standard 45 l/P·d, Daniel 29.10.). */
  bedarfKey?: string;
  literProPersonTag?: number;
  /** Nutzwarmwasser direkt [l/d]. */
  vwuLiterTag?: number;
  /** Nutzfläche je Wohneinheit [m²] für die SIA-385/2-Belegung. */
  wohneinheitenAnfM2?: number[];
  /** Bekanntes Speichervolumen [l] → Speicherverlust aus Diagramm (sonst Prozent-Richtwert). */
  speicherVolumenLiter?: number;
  speicherverlustProzent?: number;
  zirkulation: ZirkulationsArt;
  zirkulationLaengeM?: number;
  ausstossProzent?: number;
}

export interface ProjektState {
  name: string;
  kunde?: string;
  adresse?: string;
  bearbeiter?: string;
  notiz?: string;
  /** Bezugsdatum (ISO) für «heute» in Zeitgewichtungen; ohne Angabe Datum von meta.geaendert. */
  bezugsdatum?: string;
}

export interface StandortState {
  plz?: string;
  ort?: string;
  kanton?: string;
  hoeheM?: number;
  stationOverride?: string;
  thetaEOverrideC?: number;
  thetaMittelOverrideC?: number;
}

export interface GebaeudeState {
  typ: Gebaeudetyp | null;
  standort: StandortState;
  baujahr?: number;
  geschosse?: number;
  wohneinheiten?: number;
  keller: 'unbeheizt' | 'beheizt' | 'keiner' | null;
  dachform: 'steil' | 'flach' | null;
  /** Nur Steildach: Dachraum beheizt (Dach = Hülle) oder Estrich unbeheizt (Decke = Hülle). */
  dachraumBeheizt?: boolean;
  ebfModus: 'raeume' | 'manuell';
  ebfManuellM2?: number;
  energiestandard: Energiestandard;
}

/**
 * Eine Sanierung — eine Liste für beide Modi (Schritt 2):
 *  FWS: Massnahme + Einsparung (Folie 36) + Datum → Zeitgewichtung der Verbrauchsjahre (§3a).
 *  raumweise: dieselbe Massnahme setzt die Bauteiltypen der passenden Art auf «saniert ab Jahr X»
 *  (Stufen/U-Override optional); `bauteiltypIds` schränkt auf einzelne Typen ein.
 */
export interface SanierungState {
  id: string;
  massnahme: Massnahme;
  status: 'ausgefuehrt' | 'geplant';
  /** YYYY, YYYY-MM oder YYYY-MM-DD. */
  datum?: string;
  einsparungProzent?: number;
  bezeichnung?: string;
  bauteiltypIds?: string[];
  stufen?: Stufen;
  uOverride?: number;
}

/** Verbrauchsreihe je Energieträger (Session 7b): Erfassungsart + Einträge mit stabilen ids. */
export interface VerbrauchsReiheState extends VerbrauchsReihe {
  id: string;
  art: Erfassungsart;
  zeitraeume?: (ZeitraumEintrag & { id: string })[];
  ablesungen?: (Ablesung & { id: string })[];
  lieferungen?: (Lieferung & { id: string })[];
  zaehlerstaende?: (Zaehlerstand & { id: string })[];
}

export interface VerbrauchState {
  quelle: VerbrauchsQuelle | null;
  /** Eine Reihe je Energieträger: Zeiträume/Kalenderjahre, Lieferungen + Tankstände oder Zählerstände (v3). */
  reihen: VerbrauchsReiheState[];
  eta: Partial<Record<Energietraeger, EtaAngabe>>;
  konvention: Konvention;
  bedarfsart: Bedarfsart;
  tvollOverride?: number;
  klimabereinigung: boolean;
  /** «Enthielt der bisherige Verbrauch Warmwasser?» → Abzug. */
  wwBisher: boolean | null;
  abzug: WwAngaben;
  wpBetriebsstunden: { zaehlerH?: number; betriebsjahre?: number; qWpW?: number; stromKwhA?: number; cop?: number; von?: string; bis?: string; erdsondeLaengeM?: number };
  messung: { qnHeizungKwhA?: number; von?: string; bis?: string };
}

/** Bauteiltyp der Hülle (Sanierung kommt nur aus `sanierungen[]` — eine Quelle). */
export interface HuelleBauteiltyp {
  id: string;
  art: BauteilArt;
  bezeichnung?: string;
  stufen?: Stufen;
  uOverride?: number;
}

/**
 * Raum-Bauteil im State (Session 7b): `art` darf generisch sein (`boden`/`decke` → Kern wählt Keller-/Erdreichboden
 * bzw. Dach/Estrichdecke nach Gebäude) und `anschluss` darf `auto` sein (aus Keller/Dachform des Gebäudes).
 * Ohne `typId` leitet der Kern einen Standard-Bauteiltyp aus Baujahr und Sanierungen ab (nicht im State).
 */
export interface RaumBauteilState extends Omit<RaumBauteilEingabe, 'art' | 'anschluss'> {
  id: string;
  art?: RaumBauteilArtGenerisch;
  anschluss: Anschluss | AnschlussAuto;
}

export interface RaumState extends Omit<RaumEingabe, 'bauteile'> {
  bauteile: RaumBauteilState[];
}

export interface HuelleState {
  bauteiltypen: HuelleBauteiltyp[];
  lueftung: { konzept?: Lueftungskonzept; dichtheit?: Dichtheit; fensterErsetzt?: boolean };
  waermebruecken: { key?: 'bestand' | 'neubau' | 'nachweis'; deltaU?: number };
  erdreich: { bodenflaecheM2?: number; umfangM?: number; bStrichM?: number; grundwasserNah?: boolean; wandDickeM?: number; boden?: 'default' | 'tonLehm' | 'sandKies' };
  geschosshoeheM?: number;
  rest: RestEingabe;
}

export interface WarmwasserState extends WwAngaben {
  /** «Bereitet die neue WP Warmwasser?» */
  wwKuenftig: boolean | null;
  tLadeC?: number;
  fStoKey?: string;
}

export interface WaermeabgabeRaumState {
  heizflaechen: HeizflaecheEingabe[];
  ausklammern?: boolean;
  ausklammernGrund?: string;
  phiHLManuellW?: number;
}

export interface WaermeabgabeState {
  heizkreise: HeizkreisEingabe[];
  /** Wärmeabgabesystem, solange keine Heizflächen erfasst sind: bestimmt Standard-Vorlauf (FBH 35 / Radiatoren 55 °C), Puffer- und MAG-Kriterium. */
  system?: 'fbh' | 'radiatoren' | 'gemischt';
  /** Heizflächen je Raum (Schlüssel = Raum-id aus `raeume`). */
  raeume: Record<string, WaermeabgabeRaumState>;
  zielVLC?: number;
  heizkurveAlt?: { tVLC?: number; tRLC?: number };
  auslegungsVLOverrideC?: number;
}

export interface ZuschlaegeState {
  /** «Gibt es eine EVU-Sperrzeit?» */
  sperrzeitAktiv: boolean | null;
  /** Kumulierte Sperrzeit [h/d]. */
  sperrzeitH?: number;
  zusatz: Zusatzverbraucher[];
}

export interface SpeicherState {
  ww: { volumenOverrideLiter?: number };
  puffer: {
    /** null = Vorschlag des Kerns; false = bewusst kein Puffer (effektiv 0 l, FLOW-07). */
    aktiv: boolean | null;
    einzelraumregelung: boolean | null;
    sperrzeitUeberbrueckung: boolean;
    volumenOverrideLiter?: number;
  };
  mag: { anlagenvolumenLiter?: number; p0Bar?: number; pSvBar?: number };
}

export interface GeraetState {
  quelle: WpQuelle;
  auswahlId: string | null;
  /** Heizleistung des gewählten Geräts am Auslegungspunkt (θe, Auslegungs-VL) laut Datenblatt [W] (FWS Folie 93). */
  qWpAuslegungW?: number;
  filterOverrides: { toleranzUntenProzent?: number; aufstellung?: 'aussen' | 'innen'; schallNachtMaxDb?: number; vorlaufC?: number };
}

/** Zusatzmodule (Anbindung Session 11) — hier nur Platz im Schema, Inhalt frei. */
export interface ZusatzState {
  foerderung: Record<string, unknown>;
  bewilligung: Record<string, unknown>;
  offerte: Record<string, unknown>;
}

export interface MetaState {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  /** ISO-Zeitstempel. */
  erstellt: string;
  geaendert: string;
}

export interface State {
  meta: MetaState;
  projekt: ProjektState;
  methode: Methode | null;
  gebaeude: GebaeudeState;
  sanierungen: SanierungState[];
  verbrauch: VerbrauchState;
  huelle: HuelleState;
  /** Räume — eine Liste für beide Modi (raumweise: mit Bauteilen; FWS: nur für Heizflächen). */
  raeume: RaumState[];
  warmwasser: WarmwasserState;
  waermeabgabe: WaermeabgabeState;
  zuschlaege: ZuschlaegeState;
  speicher: SpeicherState;
  geraet: GeraetState;
  zusatz: ZusatzState;
}

/* ---------------------------------------------------------------------------------------------- */
/* Standardzustand                                                                                 */
/* ---------------------------------------------------------------------------------------------- */

export function neueWwAngaben(): WwAngaben {
  return { methode: 'personen', zirkulation: 'keine' };
}

export function neuerState(o: { id: string; jetzt: string }): State {
  return {
    meta: { schemaVersion: SCHEMA_VERSION, id: o.id, erstellt: o.jetzt, geaendert: o.jetzt },
    projekt: { name: '' },
    methode: null,
    gebaeude: { typ: null, standort: {}, keller: null, dachform: null, ebfModus: 'manuell', energiestandard: 'keiner' },
    sanierungen: [],
    verbrauch: {
      quelle: null,
      reihen: [],
      eta: {},
      konvention: 'fwsKurs',
      bedarfsart: 'raumwaerme_wohnen',
      klimabereinigung: false,
      wwBisher: null,
      abzug: neueWwAngaben(),
      wpBetriebsstunden: {},
      messung: {},
    },
    huelle: { bauteiltypen: [], lueftung: {}, waermebruecken: {}, erdreich: {}, rest: { modus: 'keiner' } },
    raeume: [],
    warmwasser: { ...neueWwAngaben(), wwKuenftig: null },
    waermeabgabe: { heizkreise: [], raeume: {} },
    zuschlaege: { sperrzeitAktiv: null, zusatz: [] },
    speicher: { ww: {}, puffer: { aktiv: null, einzelraumregelung: null, sperrzeitUeberbrueckung: false }, mag: {} },
    geraet: { quelle: 'luftWasser', auswahlId: null, filterOverrides: {} },
    zusatz: { foerderung: {}, bewilligung: {}, offerte: {} },
  };
}

/* ---------------------------------------------------------------------------------------------- */
/* Validierung / Normalisierung                                                                    */
/* ---------------------------------------------------------------------------------------------- */

type Probleme = string[];
type Pruefer = (v: unknown, pfad: string, p: Probleme) => unknown;
type Feldtyp = 'zahl' | 'text' | 'bool' | readonly string[] | Pruefer;

const istObjekt = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function pruefeFeld(v: unknown, typ: Feldtyp, pfad: string, p: Probleme): unknown {
  if (v === undefined) return undefined;
  if (typeof typ === 'function') return typ(v, pfad, p);
  if (typ === 'zahl') {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (v !== null && v !== '') p.push(`${pfad}: keine Zahl (${JSON.stringify(v)}) — verworfen`);
    return undefined;
  }
  if (typ === 'text') {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (v !== null) p.push(`${pfad}: kein Text — verworfen`);
    return undefined;
  }
  if (typ === 'bool') {
    if (typeof v === 'boolean') return v;
    if (v !== null) p.push(`${pfad}: kein Ja/Nein — verworfen`);
    return undefined;
  }
  if (typeof v === 'string' && typ.includes(v)) return v;
  if (v !== null) p.push(`${pfad}: unbekannter Wert ${JSON.stringify(v)} — verworfen`);
  return undefined;
}

/** Kopiert nur bekannte Felder mit gültigem Typ; fehlende/ungültige fallen weg. */
function felder(raw: unknown, spec: Record<string, Feldtyp>, pfad: string, p: Probleme): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (raw === undefined || raw === null) return out;
  if (!istObjekt(raw)) {
    p.push(`${pfad}: kein Objekt — verworfen`);
    return out;
  }
  for (const [k, typ] of Object.entries(spec)) {
    const v = pruefeFeld(raw[k], typ, `${pfad}.${k}`, p);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const objekt = (spec: Record<string, Feldtyp>): Pruefer => (v, pfad, p) => felder(v, spec, pfad, p);
const zahlenliste: Pruefer = (v, pfad, p) => {
  if (!Array.isArray(v)) {
    p.push(`${pfad}: keine Liste — verworfen`);
    return undefined;
  }
  return v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
};
const textliste: Pruefer = (v, pfad, p) => {
  if (!Array.isArray(v)) {
    p.push(`${pfad}: keine Liste — verworfen`);
    return undefined;
  }
  return v.filter((x): x is string => typeof x === 'string');
};
const freiesObjekt: Pruefer = (v, pfad, p) => {
  if (istObjekt(v)) return JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
  p.push(`${pfad}: kein Objekt — verworfen`);
  return undefined;
};

/** Liste von Objekten mit id; Elemente ohne gültige id oder Pflichtfeld werden verworfen. */
function liste<T>(raw: unknown, pfad: string, p: Probleme, element: (v: unknown, pfad: string) => T | null): T[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    p.push(`${pfad}: keine Liste — verworfen`);
    return [];
  }
  const out: T[] = [];
  const ids = new Set<string>();
  raw.forEach((v, i) => {
    const r = element(v, `${pfad}[${i}]`);
    if (r === null) return;
    const id = (r as { id?: unknown }).id;
    if (typeof id === 'string') {
      if (ids.has(id)) {
        p.push(`${pfad}[${i}]: id «${id}» doppelt — verworfen`);
        return;
      }
      ids.add(id);
    }
    out.push(r);
  });
  return out;
}

function mitId(v: unknown, pfad: string, p: Probleme): v is Record<string, unknown> & { id: string } {
  if (!istObjekt(v) || typeof v.id !== 'string' || !v.id) {
    p.push(`${pfad}: Eintrag ohne id — verworfen`);
    return false;
  }
  return true;
}

const ENERGIEN: readonly string[] = ENERGIETRAEGER;
const MASSNAHMEN: readonly string[] = ['fenster', 'fassade', 'estrich', 'kellerdecke', 'individuell'];
const BAUTEIL_ARTEN: readonly string[] = ['aussenwand', 'dachSteil', 'dachFlach', 'deckeEstrich', 'bodenKeller', 'bodenErdreich', 'fenster', 'tuer', 'innenwand', 'innendecke', 'innentuer'];
const RAUM_BAUTEIL_ARTEN: readonly string[] = [...BAUTEIL_ARTEN, 'boden', 'decke'];
const ZIRKULATION: readonly string[] = ['keine', 'rohrAnRohr', 'separat', 'unbekannt', 'warmhalteband'];
const ERFASSUNGSARTEN: readonly string[] = ['zeitraeume', 'lieferungen', 'zaehlerstaende'];

const STUFEN_SPEC: Record<string, Feldtyp> = { bauweise: 'text', dickeM: 'zahl', daemmung: 'bool', daemmstoff: 'text', daemmdickeM: 'zahl', generation: 'text', rahmen: 'text', typ: 'text' };

function wwAngaben(raw: unknown, pfad: string, p: Probleme): WwAngaben {
  const f = felder(raw, {
    methode: ['personen', 'direkt', 'belegung'],
    personen: 'zahl',
    bedarfKey: 'text',
    literProPersonTag: 'zahl',
    vwuLiterTag: 'zahl',
    wohneinheitenAnfM2: zahlenliste,
    speicherVolumenLiter: 'zahl',
    speicherverlustProzent: 'zahl',
    zirkulation: ZIRKULATION,
    zirkulationLaengeM: 'zahl',
    ausstossProzent: 'zahl',
  }, pfad, p);
  return { ...neueWwAngaben(), ...f } as WwAngaben;
}

function anschluss(raw: unknown, pfad: string, p: Probleme): Anschluss | AnschlussAuto {
  const art = istObjekt(raw) ? raw.art : undefined;
  switch (art) {
    case 'aussen':
    case 'auto':
      return { art };
    case 'unbeheizt':
      return { art, ...felder(raw, { situation: ['keller', 'dachraum', 'garage', 'treppenhaus', 'nebenraum'], nd3: objekt({ lage: ['seitlich', 'keller', 'estrich'], flaechen: ['eineFlaeche', 'zweiFlaechen', 'mehrFlaechen'], dicht: 'bool' }), bU: 'zahl', thetaNachbarC: 'zahl' }, pfad, p) } as Anschluss;
    case 'erdreich':
      return { art, ...felder(raw, { tiefeM: 'zahl' }, pfad, p) } as Anschluss;
    case 'beheizt':
      return { art, ...felder(raw, { thetaNachbarC: 'zahl', andereEinheit: 'bool' }, pfad, p) } as Anschluss;
    case 'faktor': {
      const f = felder(raw, { f: 'zahl', zaehltZurHuelle: 'bool' }, pfad, p);
      return { art, f: (f.f as number | undefined) ?? 1, ...(f.zaehltZurHuelle !== undefined ? { zaehltZurHuelle: f.zaehltZurHuelle as boolean } : {}) };
    }
    default:
      p.push(`${pfad}: Anschluss unbekannt — «aussen» angenommen`);
      return { art: 'aussen' };
  }
}

function raumBauteil(v: unknown, pfad: string, p: Probleme): RaumBauteilState | null {
  if (!mitId(v, pfad, p)) return null;
  const f = felder(v, { id: 'text', typId: 'text', art: RAUM_BAUTEIL_ARTEN, bezeichnung: 'text', flaecheM2: 'zahl', uOverride: 'zahl' }, pfad, p);
  return { ...f, flaecheM2: (f.flaecheM2 as number | undefined) ?? 0, anschluss: anschluss(v.anschluss, `${pfad}.anschluss`, p) } as RaumBauteilState;
}

function raum(v: unknown, pfad: string, p: Probleme): RaumState | null {
  if (!mitId(v, pfad, p)) return null;
  const f = felder(v, { id: 'text', name: 'text', geschoss: 'text', typ: 'text', flaecheM2: 'zahl', laengeM: 'zahl', breiteM: 'zahl', hoeheM: 'zahl', thetaIntC: 'zahl', nMinOverride: 'zahl', zuluft: 'bool', aussenbezug: 'bool', beheizt: 'bool', inEbf: 'bool' }, pfad, p);
  return { ...f, name: (f.name as string | undefined) ?? '', typ: (f.typ as string | undefined) ?? 'wohnen', bauteile: liste(v.bauteile, `${pfad}.bauteile`, p, (x, q) => raumBauteil(x, q, p)) } as RaumState;
}

function verbrauchsReihe(v: unknown, pfad: string, p: Probleme): VerbrauchsReiheState | null {
  if (!mitId(v, pfad, p)) return null;
  const f = felder(v, { id: 'text', energietraeger: ENERGIEN, art: ERFASSUNGSARTEN }, pfad, p);
  if (!f.energietraeger) return null;
  const art = (f.art as Erfassungsart | undefined) ?? 'zeitraeume';
  const reihe: VerbrauchsReiheState = { id: f.id as string, energietraeger: f.energietraeger as Energietraeger, art };
  const mitListe = <T>(key: 'zeitraeume' | 'ablesungen' | 'lieferungen' | 'zaehlerstaende', spec: Record<string, Feldtyp>, pflicht: string[]) => {
    if (v[key] === undefined) return;
    const l = liste(v[key], `${pfad}.${key}`, p, (x, q) => {
      if (!mitId(x, q, p)) return null;
      const e = felder(x, { id: 'text', ...spec }, q, p);
      for (const k of pflicht) if (e[k] === undefined) e[k] = k === 'datum' ? '' : 0;
      return e as unknown as T;
    });
    (reihe as unknown as Record<string, unknown>)[key] = l;
  };
  mitListe('zeitraeume', { menge: 'zahl', jahr: 'zahl', von: 'text', bis: 'text', hgtIstKd: 'zahl' }, ['menge']);
  mitListe('ablesungen', { datum: 'text', bestand: 'zahl', hgtIstKd: 'zahl' }, ['datum', 'bestand']);
  mitListe('lieferungen', { datum: 'text', menge: 'zahl' }, ['datum', 'menge']);
  mitListe('zaehlerstaende', { datum: 'text', stand: 'zahl', hgtIstKd: 'zahl' }, ['datum', 'stand']);
  return reihe;
}

function heizflaeche(v: unknown, pfad: string, p: Probleme): HeizflaecheEingabe | null {
  if (!mitId(v, pfad, p)) return null;
  if (typeof v.bauart !== 'string' || !(BAUARTEN as readonly string[]).includes(v.bauart)) {
    p.push(`${pfad}: Bauart ${JSON.stringify(v.bauart)} unbekannt — Heizfläche verworfen`);
    return null;
  }
  return felder(v, {
    id: 'text',
    bauart: BAUARTEN,
    kreisId: 'text',
    bezeichnung: 'text',
    hoeheMm: 'zahl',
    laengeMm: 'zahl',
    tiefeMm: 'zahl',
    nabenabstandMm: 'zahl',
    glieder: 'zahl',
    gliedbreiteMm: 'zahl',
    einbau: ['verkleidet', 'unterflur'],
    designTyp: ['20', '22'],
    flaecheM2: 'zahl',
    verlegeabstandMm: 'zahl',
    belag: ['keramik', 'pvc_linoleum', 'parkett', 'laminat', 'teppich', 'teppichDick'],
    rlb: 'zahl',
    system: ['trockenbau', 'nassputz'],
    modellId: 'text',
    typenschild: (t, q, pp) => {
      const o = felder(t, { qNW: 'zahl', tVLC: 'zahl', tRLC: 'zahl', tRaumC: 'zahl', n: 'zahl' }, q, pp);
      if (o.qNW === undefined || o.tVLC === undefined || o.tRLC === undefined || o.tRaumC === undefined) {
        pp.push(`${q}: Typenschild unvollständig — verworfen`);
        return undefined;
      }
      return o;
    },
    minderungen: (m, q, pp) => {
      const nb: Pruefer = (x, qq, ppp) => (typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)) ? x : (ppp.push(`${qq}: ungültig — verworfen`), undefined));
      return felder(m, { nische: nb, verkleidung: nb, oberflaeche: nb, anschluss: ['wechselseitig', 'reitend'] }, q, pp);
    },
    nOverride: 'zahl',
  }, pfad, p) as unknown as HeizflaecheEingabe;
}

function rest(raw: unknown, pfad: string, p: Probleme): RestEingabe {
  const modus = istObjekt(raw) ? raw.modus : undefined;
  if (modus === 'huellflaechen') {
    return {
      modus,
      ...felder(raw, {
        flaecheM2: 'zahl', volumenM3: 'zahl', aAussenwandM2: 'zahl', aFensterM2: 'zahl', aTuerM2: 'zahl', aDachM2: 'zahl', aDeckeEstrichM2: 'zahl', aBodenM2: 'zahl',
        bodenAnschluss: ['keller', 'erdreich'], thetaIntC: 'zahl',
        typIds: objekt({ aussenwand: 'text', fenster: 'text', tuer: 'text', dach: 'text', decke: 'text', boden: 'text' }),
      }, pfad, p),
    } as RestEingabe;
  }
  if (modus === 'spezifisch') return { modus, ...felder(raw, { flaecheM2: 'zahl', phiSpezWm2: 'zahl' }, pfad, p) } as RestEingabe;
  if (modus !== undefined && modus !== 'keiner') p.push(`${pfad}.modus: unbekannt — «keiner»`);
  return { modus: 'keiner' };
}

function nullbarBool(v: unknown, pfad: string, p: Probleme): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v !== undefined && v !== null) p.push(`${pfad}: kein Ja/Nein — offen`);
  return null;
}
function nullbarEnum<T extends string>(v: unknown, erlaubt: readonly T[], pfad: string, p: Probleme): T | null {
  if (typeof v === 'string' && (erlaubt as readonly string[]).includes(v)) return v as T;
  if (v !== undefined && v !== null) p.push(`${pfad}: unbekannter Wert ${JSON.stringify(v)} — offen`);
  return null;
}

/**
 * Validiert und normalisiert einen State v2 (z. B. aus localStorage, Cloud oder Import).
 * Wirft nie; Probleme werden protokolliert und die betroffenen Angaben verworfen.
 */
export function normalisiereState(raw: unknown, o: { id: string; jetzt: string }): { state: State; probleme: string[] } {
  const p: Probleme = [];
  const r = istObjekt(raw) ? raw : (p.push('State ist kein Objekt — leeres Projekt'), {});
  const basis = neuerState(o);

  const metaRaw = felder(r.meta, { id: 'text', erstellt: 'text', geaendert: 'text' }, 'meta', p);
  const meta: MetaState = { schemaVersion: SCHEMA_VERSION, id: (metaRaw.id as string | undefined) || o.id, erstellt: (metaRaw.erstellt as string | undefined) ?? o.jetzt, geaendert: (metaRaw.geaendert as string | undefined) ?? o.jetzt };

  const projekt = { ...felder(r.projekt, { name: 'text', kunde: 'text', adresse: 'text', bearbeiter: 'text', notiz: 'text', bezugsdatum: 'text' }, 'projekt', p) } as Partial<ProjektState>;

  const g = istObjekt(r.gebaeude) ? r.gebaeude : {};
  const gf = felder(g, { baujahr: 'zahl', geschosse: 'zahl', wohneinheiten: 'zahl', dachraumBeheizt: 'bool', ebfManuellM2: 'zahl' }, 'gebaeude', p);
  const gebaeude: GebaeudeState = {
    ...basis.gebaeude,
    ...gf,
    typ: nullbarEnum(g.typ, ['efh', 'mfh'] as const, 'gebaeude.typ', p),
    standort: felder(g.standort, { plz: 'text', ort: 'text', kanton: 'text', hoeheM: 'zahl', stationOverride: 'text', thetaEOverrideC: 'zahl', thetaMittelOverrideC: 'zahl' }, 'gebaeude.standort', p) as StandortState,
    keller: nullbarEnum(g.keller, ['unbeheizt', 'beheizt', 'keiner'] as const, 'gebaeude.keller', p),
    dachform: nullbarEnum(g.dachform, ['steil', 'flach'] as const, 'gebaeude.dachform', p),
    ebfModus: nullbarEnum(g.ebfModus, ['raeume', 'manuell'] as const, 'gebaeude.ebfModus', p) ?? basis.gebaeude.ebfModus,
    energiestandard: nullbarEnum(g.energiestandard, ['keiner', 'minergie', 'minergieP'] as const, 'gebaeude.energiestandard', p) ?? 'keiner',
  };

  const sanierungen = liste(r.sanierungen, 'sanierungen', p, (v, q) => {
    if (!mitId(v, q, p)) return null;
    const f = felder(v, { id: 'text', massnahme: MASSNAHMEN, status: ['ausgefuehrt', 'geplant'], datum: 'text', einsparungProzent: 'zahl', bezeichnung: 'text', bauteiltypIds: textliste, stufen: objekt(STUFEN_SPEC), uOverride: 'zahl' }, q, p);
    if (!f.massnahme) return null;
    return { status: 'ausgefuehrt', ...f } as SanierungState;
  });

  const v = istObjekt(r.verbrauch) ? r.verbrauch : {};
  const eta: Partial<Record<Energietraeger, EtaAngabe>> = {};
  if (istObjekt(v.eta)) for (const t of ENERGIETRAEGER) if (v.eta[t] !== undefined) eta[t] = felder(v.eta[t], { preset: 'text', wert: 'zahl' }, `verbrauch.eta.${t}`, p) as EtaAngabe;
  const vf = felder(v, { konvention: ['fwsKurs', 'hi'], bedarfsart: ['raumwaerme_wohnen', 'raumwaerme_ww_wohnen', 'raumwaerme_wochenendabsenkung'], tvollOverride: 'zahl', klimabereinigung: 'bool' }, 'verbrauch', p);
  const verbrauch: VerbrauchState = {
    ...basis.verbrauch,
    ...vf,
    quelle: nullbarEnum(v.quelle, ['rechnungen', 'wpBetriebsstunden', 'messung', 'keine'] as const, 'verbrauch.quelle', p),
    reihen: liste(v.reihen, 'verbrauch.reihen', p, (x, q) => verbrauchsReihe(x, q, p)),
    eta,
    wwBisher: nullbarBool(v.wwBisher, 'verbrauch.wwBisher', p),
    abzug: wwAngaben(v.abzug, 'verbrauch.abzug', p),
    wpBetriebsstunden: felder(v.wpBetriebsstunden, { zaehlerH: 'zahl', betriebsjahre: 'zahl', qWpW: 'zahl', stromKwhA: 'zahl', cop: 'zahl', von: 'text', bis: 'text', erdsondeLaengeM: 'zahl' }, 'verbrauch.wpBetriebsstunden', p),
    messung: felder(v.messung, { qnHeizungKwhA: 'zahl', von: 'text', bis: 'text' }, 'verbrauch.messung', p),
  } as VerbrauchState;

  const h = istObjekt(r.huelle) ? r.huelle : {};
  const huelle: HuelleState = {
    bauteiltypen: liste(h.bauteiltypen, 'huelle.bauteiltypen', p, (x, q) => {
      if (!mitId(x, q, p)) return null;
      const f = felder(x, { id: 'text', art: BAUTEIL_ARTEN, bezeichnung: 'text', stufen: objekt(STUFEN_SPEC), uOverride: 'zahl' }, q, p);
      return f.art ? (f as unknown as HuelleBauteiltyp) : null;
    }),
    lueftung: felder(h.lueftung, { konzept: ['natuerlich', 'wrg', 'lufterwaermung', 'abluftDauer'], dichtheit: ['neubau', 'altbau'], fensterErsetzt: 'bool' }, 'huelle.lueftung', p),
    waermebruecken: felder(h.waermebruecken, { key: ['bestand', 'neubau', 'nachweis'], deltaU: 'zahl' }, 'huelle.waermebruecken', p),
    erdreich: felder(h.erdreich, { bodenflaecheM2: 'zahl', umfangM: 'zahl', bStrichM: 'zahl', grundwasserNah: 'bool', wandDickeM: 'zahl', boden: ['default', 'tonLehm', 'sandKies'] }, 'huelle.erdreich', p),
    ...felder(h, { geschosshoeheM: 'zahl' }, 'huelle', p),
    rest: rest(h.rest, 'huelle.rest', p),
  } as HuelleState;

  const raeume = liste(r.raeume, 'raeume', p, (x, q) => raum(x, q, p));

  const w = istObjekt(r.warmwasser) ? r.warmwasser : {};
  const warmwasser: WarmwasserState = {
    ...wwAngaben(w, 'warmwasser', p),
    ...felder(w, { tLadeC: 'zahl', fStoKey: 'text' }, 'warmwasser', p),
    wwKuenftig: nullbarBool(w.wwKuenftig, 'warmwasser.wwKuenftig', p),
  } as WarmwasserState;

  const wa = istObjekt(r.waermeabgabe) ? r.waermeabgabe : {};
  const waRaeume: Record<string, WaermeabgabeRaumState> = {};
  if (istObjekt(wa.raeume)) {
    for (const [rid, rv] of Object.entries(wa.raeume)) {
      const q = `waermeabgabe.raeume.${rid}`;
      const f = felder(rv, { ausklammern: 'bool', ausklammernGrund: 'text', phiHLManuellW: 'zahl' }, q, p);
      waRaeume[rid] = { ...f, heizflaechen: liste(istObjekt(rv) ? rv.heizflaechen : undefined, `${q}.heizflaechen`, p, (x, qq) => heizflaeche(x, qq, p)) } as WaermeabgabeRaumState;
    }
  }
  const waermeabgabe: WaermeabgabeState = {
    heizkreise: liste(wa.heizkreise, 'waermeabgabe.heizkreise', p, (x, q) => (mitId(x, q, p) ? (felder(x, { id: 'text', bezeichnung: 'text', tVLC: 'zahl', spreizungK: 'zahl', gemischt: 'bool' }, q, p) as unknown as HeizkreisEingabe) : null)),
    raeume: waRaeume,
    ...felder(wa, { system: ['fbh', 'radiatoren', 'gemischt'], zielVLC: 'zahl', heizkurveAlt: objekt({ tVLC: 'zahl', tRLC: 'zahl' }), auslegungsVLOverrideC: 'zahl' }, 'waermeabgabe', p),
  } as WaermeabgabeState;

  const z = istObjekt(r.zuschlaege) ? r.zuschlaege : {};
  const zusatzListe: Zusatzverbraucher[] = Array.isArray(z.zusatz)
    ? z.zusatz.flatMap((x, i) => {
        const f = felder(x, { bezeichnung: 'text', leistungW: 'zahl' }, `zuschlaege.zusatz[${i}]`, p);
        return f.leistungW !== undefined ? [{ bezeichnung: (f.bezeichnung as string | undefined) ?? '', leistungW: f.leistungW as number }] : [];
      })
    : [];
  const zuschlaege: ZuschlaegeState = { ...felder(z, { sperrzeitH: 'zahl' }, 'zuschlaege', p), sperrzeitAktiv: nullbarBool(z.sperrzeitAktiv, 'zuschlaege.sperrzeitAktiv', p), zusatz: zusatzListe } as ZuschlaegeState;

  const s = istObjekt(r.speicher) ? r.speicher : {};
  const pu = istObjekt(s.puffer) ? s.puffer : {};
  const speicher: SpeicherState = {
    ww: felder(s.ww, { volumenOverrideLiter: 'zahl' }, 'speicher.ww', p),
    puffer: {
      ...felder(pu, { volumenOverrideLiter: 'zahl' }, 'speicher.puffer', p),
      aktiv: nullbarBool(pu.aktiv, 'speicher.puffer.aktiv', p),
      einzelraumregelung: nullbarBool(pu.einzelraumregelung, 'speicher.puffer.einzelraumregelung', p),
      sperrzeitUeberbrueckung: pu.sperrzeitUeberbrueckung === true,
    },
    mag: felder(s.mag, { anlagenvolumenLiter: 'zahl', p0Bar: 'zahl', pSvBar: 'zahl' }, 'speicher.mag', p),
  } as SpeicherState;

  const ge = istObjekt(r.geraet) ? r.geraet : {};
  const geraet: GeraetState = {
    quelle: nullbarEnum(ge.quelle, ['luftWasser', 'soleWasser', 'wasserWasser'] as const, 'geraet.quelle', p) ?? 'luftWasser',
    auswahlId: typeof ge.auswahlId === 'string' && ge.auswahlId ? ge.auswahlId : null,
    ...felder(ge, { qWpAuslegungW: 'zahl' }, 'geraet', p),
    filterOverrides: felder(ge.filterOverrides, { toleranzUntenProzent: 'zahl', aufstellung: ['aussen', 'innen'], schallNachtMaxDb: 'zahl', vorlaufC: 'zahl' }, 'geraet.filterOverrides', p),
  };

  const zu = istObjekt(r.zusatz) ? r.zusatz : {};
  const zusatz: ZusatzState = {
    foerderung: (pruefeFeld(zu.foerderung, freiesObjekt, 'zusatz.foerderung', p) as Record<string, unknown> | undefined) ?? {},
    bewilligung: (pruefeFeld(zu.bewilligung, freiesObjekt, 'zusatz.bewilligung', p) as Record<string, unknown> | undefined) ?? {},
    offerte: (pruefeFeld(zu.offerte, freiesObjekt, 'zusatz.offerte', p) as Record<string, unknown> | undefined) ?? {},
  };

  const state: State = {
    meta,
    projekt: { name: '', ...projekt },
    methode: nullbarEnum(r.methode, ['fws', 'raumweise'] as const, 'methode', p),
    gebaeude,
    sanierungen,
    verbrauch,
    huelle,
    raeume,
    warmwasser,
    waermeabgabe,
    zuschlaege,
    speicher,
    geraet,
    zusatz,
  };
  return { state, probleme: p };
}
