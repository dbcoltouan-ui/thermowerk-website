/**
 * Relevanz bedingter Felder (Session 6; KONTEXT §2 «Relevanz», befund_ux-datenfluss §2.2/§5.3).
 *
 * `relevant(pfad, state)` ist die EINE Stelle, die entscheidet, ob eine Angabe gilt: die UI rendert
 * irrelevante Felder nicht (kein `hidden`, kein Dimmen), der Bericht druckt sie nicht, `berechne()` liest
 * sie nicht. Regeln sind hierarchisch: ein Pfad ist relevant, wenn ALLE Regeln gelten, deren Muster ein
 * Präfix des Pfads ist (`verbrauch.abzug.personen` braucht `verbrauch`, `verbrauch.abzug` und
 * `verbrauch.abzug.personen`). `*` steht für eine Listen-id; die Regel bekommt die eingesetzten ids.
 *
 * Pfade ohne Regel sind relevant. Die Tabelle `RELEVANZ_REGELN` ist zentral getestet.
 */
import type { HkDaten } from '../daten/heizkoerper';
import type { State, WwAngaben } from '../state/schema';
import type { Bauart, MassFeld } from './waermeabgabe';
import { relevanteMasse } from './waermeabgabe';

export const SCHRITT_IDS = ['projekt', 'gebaeude', 'sanierungen', 'verbrauch', 'huelle', 'heizlast', 'warmwasser', 'waermeabgabe', 'zuschlaege', 'speicher', 'waermepumpe', 'bericht'] as const;
export type SchrittId = (typeof SCHRITT_IDS)[number];
export type SchrittStatus = 'offen' | 'vollstaendig' | 'annahmen' | 'warnung';

export interface RelevanzRegel {
  muster: string;
  /** Klartext der Bedingung (Doku, Tests). */
  wenn: string;
  pruefe: (s: State, ids: string[]) => boolean;
}

const fws = (s: State) => s.methode === 'fws';
const raumweise = (s: State) => s.methode === 'raumweise';
const rechnungen = (s: State) => s.verbrauch.quelle === 'rechnungen';
const zirkLaenge = (w: WwAngaben) => w.zirkulation === 'rohrAnRohr' || w.zirkulation === 'separat';
const wwKuenftig = (s: State) => s.warmwasser.wwKuenftig === true;
const raumVorhanden = (s: State, id: string | undefined) => !!id && s.raeume.some((r) => r.id === id);
/** Heizflächen sind erfasst (irgendein vorhandener Raum hat mindestens eine). */
export function heizflaechenVorhanden(s: State): boolean {
  return s.raeume.some((r) => (s.waermeabgabe.raeume[r.id]?.heizflaechen.length ?? 0) > 0);
}

/** WW-Angaben-Regeln für einen Ast (`verbrauch.abzug` oder `warmwasser`). */
function wwRegeln(basis: string, ww: (s: State) => WwAngaben): RelevanzRegel[] {
  return [
    { muster: `${basis}.personen`, wenn: 'Methode Personen', pruefe: (s) => ww(s).methode === 'personen' },
    { muster: `${basis}.bedarfKey`, wenn: 'Methode Personen', pruefe: (s) => ww(s).methode === 'personen' },
    { muster: `${basis}.literProPersonTag`, wenn: 'Methode Personen', pruefe: (s) => ww(s).methode === 'personen' },
    { muster: `${basis}.vwuLiterTag`, wenn: 'Methode direkt (V_W,u)', pruefe: (s) => ww(s).methode === 'direkt' },
    { muster: `${basis}.wohneinheitenAnfM2`, wenn: 'Methode Belegung (SIA 385/2)', pruefe: (s) => ww(s).methode === 'belegung' },
    { muster: `${basis}.zirkulationLaengeM`, wenn: 'Zirkulation mit Leitung (Rohr-an-Rohr/separat)', pruefe: (s) => zirkLaenge(ww(s)) },
  ];
}

export const RELEVANZ_REGELN: ReadonlyArray<RelevanzRegel> = [
  // Schritt 1 Gebäude
  { muster: 'gebaeude.ebfManuellM2', wenn: 'EBF manuell', pruefe: (s) => s.gebaeude.ebfModus === 'manuell' },
  { muster: 'gebaeude.keller', wenn: 'raumweise (Bauteil-Vorbelegung)', pruefe: raumweise },
  { muster: 'gebaeude.dachform', wenn: 'raumweise (Bauteil-Vorbelegung)', pruefe: raumweise },
  { muster: 'gebaeude.dachraumBeheizt', wenn: 'raumweise und Steildach', pruefe: (s) => raumweise(s) && s.gebaeude.dachform === 'steil' },
  { muster: 'gebaeude.standort.thetaMittelOverrideC', wenn: 'raumweise (Erdreich f_g2)', pruefe: raumweise },
  // Schritt 2 Sanierungen
  { muster: 'sanierungen.*.einsparungProzent', wenn: 'FWS (Einsparung wirkt auf Verbrauchsjahre)', pruefe: fws },
  { muster: 'sanierungen.*.bauteiltypIds', wenn: 'raumweise (wirkt auf Bauteiltypen)', pruefe: raumweise },
  { muster: 'sanierungen.*.stufen', wenn: 'raumweise (wirkt auf Bauteiltypen)', pruefe: raumweise },
  { muster: 'sanierungen.*.uOverride', wenn: 'raumweise (wirkt auf Bauteiltypen)', pruefe: raumweise },
  // Schritt 3A Verbrauch
  { muster: 'verbrauch', wenn: 'Methode FWS', pruefe: fws },
  { muster: 'verbrauch.eintraege', wenn: 'Rechnungen vorhanden', pruefe: rechnungen },
  { muster: 'verbrauch.eta', wenn: 'Rechnungen vorhanden', pruefe: rechnungen },
  { muster: 'verbrauch.konvention', wenn: 'Rechnungen vorhanden', pruefe: rechnungen },
  { muster: 'verbrauch.klimabereinigung', wenn: 'Rechnungen vorhanden', pruefe: rechnungen },
  { muster: 'verbrauch.bedarfsart', wenn: 'Heizlast über Volllaststunden (Rechnungen, WP-Zähler, Messung)', pruefe: (s) => s.verbrauch.quelle !== null && s.verbrauch.quelle !== 'keine' },
  { muster: 'verbrauch.tvollOverride', wenn: 'Heizlast über Volllaststunden', pruefe: (s) => s.verbrauch.quelle !== null && s.verbrauch.quelle !== 'keine' },
  { muster: 'verbrauch.wwBisher', wenn: 'Rechnungen vorhanden', pruefe: rechnungen },
  { muster: 'verbrauch.abzug', wenn: 'Rechnungen und WW bisher über die Heizung', pruefe: (s) => rechnungen(s) && s.verbrauch.wwBisher === true },
  ...wwRegeln('verbrauch.abzug', (s) => s.verbrauch.abzug),
  { muster: 'verbrauch.wpBetriebsstunden', wenn: 'Quelle WP-Betriebsstunden', pruefe: (s) => s.verbrauch.quelle === 'wpBetriebsstunden' },
  { muster: 'verbrauch.messung', wenn: 'Quelle Wärmezähler', pruefe: (s) => s.verbrauch.quelle === 'messung' },
  // Schritt 3B Hülle & Räume
  { muster: 'huelle', wenn: 'Methode raumweise', pruefe: raumweise },
  { muster: 'huelle.rest', wenn: 'Räume erfasst', pruefe: (s) => s.raeume.length > 0 },
  { muster: 'raeume.*.bauteile', wenn: 'raumweise', pruefe: raumweise },
  { muster: 'raeume.*.hoeheM', wenn: 'raumweise', pruefe: raumweise },
  { muster: 'raeume.*.nMinOverride', wenn: 'raumweise', pruefe: raumweise },
  { muster: 'raeume.*.zuluft', wenn: 'raumweise mit Lüftungsanlage', pruefe: (s) => raumweise(s) && (s.huelle.lueftung.konzept === 'wrg' || s.huelle.lueftung.konzept === 'lufterwaermung') },
  { muster: 'raeume.*.aussenbezug', wenn: 'raumweise', pruefe: raumweise },
  { muster: 'raeume.*.inEbf', wenn: 'EBF aus Räumen', pruefe: (s) => s.gebaeude.ebfModus === 'raeume' },
  // Schritt 5 Warmwasser künftig
  { muster: 'warmwasser.methode', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  { muster: 'warmwasser.speicherVolumenLiter', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  { muster: 'warmwasser.speicherverlustProzent', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  { muster: 'warmwasser.zirkulation', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  { muster: 'warmwasser.ausstossProzent', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  { muster: 'warmwasser.tLadeC', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  { muster: 'warmwasser.fStoKey', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  ...wwRegeln('warmwasser', (s) => s.warmwasser).map((r) => ({ ...r, wenn: `WP bereitet WW, ${r.wenn}`, pruefe: (s: State, ids: string[]) => wwKuenftig(s) && r.pruefe(s, ids) })),
  // Schritt 6 Wärmeabgabe
  { muster: 'waermeabgabe.raeume.*', wenn: 'Raum existiert', pruefe: (s, [id]) => raumVorhanden(s, id) },
  { muster: 'waermeabgabe.raeume.*.phiHLManuellW', wenn: 'FWS (keine raumweise Heizlast)', pruefe: fws },
  { muster: 'waermeabgabe.zielVLC', wenn: 'Heizflächen erfasst', pruefe: heizflaechenVorhanden },
  { muster: 'waermeabgabe.heizkurveAlt', wenn: 'Heizflächen erfasst', pruefe: heizflaechenVorhanden },
  // Schritt 7 Zuschläge
  { muster: 'zuschlaege.sperrzeitH', wenn: 'Sperrzeit vorhanden', pruefe: (s) => s.zuschlaege.sperrzeitAktiv === true },
  // Schritt 8 Speicher
  { muster: 'speicher.ww', wenn: 'WP bereitet WW', pruefe: wwKuenftig },
  { muster: 'speicher.puffer.einzelraumregelung', wenn: 'Puffer nicht abgewählt', pruefe: (s) => s.speicher.puffer.aktiv !== false },
  { muster: 'speicher.puffer.volumenOverrideLiter', wenn: 'Puffer nicht abgewählt', pruefe: (s) => s.speicher.puffer.aktiv !== false },
  { muster: 'speicher.puffer.sperrzeitUeberbrueckung', wenn: 'Puffer nicht abgewählt und Sperrzeit vorhanden', pruefe: (s) => s.speicher.puffer.aktiv !== false && s.zuschlaege.sperrzeitAktiv === true },
  { muster: 'speicher.puffer.heizflaechen', wenn: 'keine Heizflächen erfasst (sonst abgeleitet)', pruefe: (s) => s.speicher.puffer.aktiv !== false && !heizflaechenVorhanden(s) },
];

function passt(muster: string[], pfad: string[]): string[] | null {
  if (muster.length > pfad.length) return null;
  const ids: string[] = [];
  for (let i = 0; i < muster.length; i++) {
    const m = muster[i]!;
    const p = pfad[i]!;
    if (m === '*') ids.push(p);
    else if (m !== p) return null;
  }
  return ids;
}

const REGELN_ZERLEGT = RELEVANZ_REGELN.map((r) => ({ ...r, teile: r.muster.split('.') }));

/**
 * Gilt die Angabe unter `pfad` beim aktuellen State? Mit `daten.hk` werden auch Heizflächen-Masse nach
 * Bauart geprüft (`waermeabgabe.raeume.<r>.heizflaechen.<hf>.<massFeld>`, `relevanteMasse`).
 */
export function relevant(pfad: string, s: State, daten?: { hk: HkDaten }): boolean {
  const teile = pfad.split('.');
  for (const r of REGELN_ZERLEGT) {
    const ids = passt(r.teile, teile);
    if (ids && !r.pruefe(s, ids)) return false;
  }
  if (daten && teile[0] === 'waermeabgabe' && teile[1] === 'raeume' && teile[3] === 'heizflaechen' && teile.length >= 6) {
    const hf = s.waermeabgabe.raeume[teile[2]!]?.heizflaechen.find((x) => x.id === teile[4]);
    const feld = teile[5] as MassFeld;
    const alleMasse: ReadonlyArray<string> = ['hoeheMm', 'laengeMm', 'tiefeMm', 'nabenabstandMm', 'glieder', 'gliedbreiteMm', 'einbau', 'designTyp', 'flaecheM2', 'verlegeabstandMm', 'belag', 'rlb', 'system'];
    if (hf && alleMasse.includes(feld)) return relevanteMasse(hf.bauart as Bauart, daten.hk).includes(feld);
  }
  return true;
}

/** Schritte, die bei den getroffenen Entscheiden angezeigt werden (Schritt 3 je Modus). */
export function schrittRelevant(id: SchrittId, s: State): boolean {
  if (id === 'verbrauch') return s.methode === 'fws';
  if (id === 'huelle') return s.methode === 'raumweise';
  return true;
}

/** Schritt, zu dem ein Eingabepfad gehört (Sprungziel für Hinweise/Annahmen). */
export function schrittVonPfad(pfad: string, s: State): SchrittId | null {
  const kopf = pfad.split('.')[0] ?? '';
  switch (kopf) {
    case 'projekt':
    case 'methode':
      return 'projekt';
    case 'gebaeude':
    case 'ebf':
      return 'gebaeude';
    case 'sanierungen':
      return 'sanierungen';
    case 'verbrauch':
      return 'verbrauch';
    case 'huelle':
      return 'huelle';
    case 'raeume':
      return s.methode === 'raumweise' ? 'huelle' : 'waermeabgabe';
    case 'warmwasser':
      return 'warmwasser';
    case 'waermeabgabe':
      return 'waermeabgabe';
    case 'zuschlaege':
      return 'zuschlaege';
    case 'speicher':
      return 'speicher';
    case 'geraet':
      return 'waermepumpe';
    default:
      return null;
  }
}

/**
 * Angaben, die erfasst sind, im aktuellen Modus aber ruhen (Hinweis beim Moduswechsel, UX-02):
 * sie bleiben im State, werden nicht gerechnet und nicht gedruckt.
 */
export function ruhendeAngaben(s: State): { pfad: string; text: string }[] {
  const out: { pfad: string; text: string }[] = [];
  if (s.methode !== 'fws' && (s.verbrauch.eintraege.length > 0 || s.verbrauch.quelle !== null)) out.push({ pfad: 'verbrauch', text: `Verbrauchsdaten (${s.verbrauch.eintraege.length} Einträge)` });
  if (s.methode !== 'raumweise') {
    if (s.huelle.bauteiltypen.length) out.push({ pfad: 'huelle', text: `Gebäudehülle (${s.huelle.bauteiltypen.length} Bauteiltypen)` });
    const mitBauteilen = s.raeume.filter((r) => r.bauteile.length > 0).length;
    if (mitBauteilen) out.push({ pfad: 'raeume', text: `Bauteile in ${mitBauteilen} Räumen` });
  }
  if (s.warmwasser.wwKuenftig === false && (s.warmwasser.personen !== undefined || s.warmwasser.vwuLiterTag !== undefined)) out.push({ pfad: 'warmwasser', text: 'Warmwasser-Angaben (WP bereitet kein WW)' });
  return out;
}
