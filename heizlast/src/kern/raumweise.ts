/**
 * Raumweise Norm-Heizlast nach SIA 384/2:2020 (Anwendung von SN EN 12831-1:2017 in der Schweiz; Befund §3,
 * FACH-22–26, FACH-30, FLOW-02/13, CODE-15) — reine Funktionen mit Herkunftsmodell.
 *
 *   Φ_T,k = (U_k + ΔU_WB) · A_k · f_k · (θint − θe)      f = 1 aussen | b_u unbeheizt (Tabelle ND.3) |
 *                                                        (θint − θnb)/(θint − θe) beheizter Nachbar |
 *                                                        f_g1·f_g2·f_GW mit U_equiv (ISO 13370) gegen Erdreich
 *   Φ_V   = V · n_min · 0.34 · (θint − θe)               n_min aus Tabelle NA.7 (Raumtyp × Lüftungskonzept × Dichtheit);
 *                                                        kein n50-Term, kein Wiederaufheizzuschlag
 *   Φ_HL,Raum = Φ_T + Φ_V                                 (Σ Räume → Heizflächen)
 *   Φ_HL,Gebäude saldiert = Σ_Räume (Σ_Hülle Φ_T + Φ_V)   nur Bauteile nach aussen/unbeheizt/Erdreich/andere Einheit
 *   EBF aus Räumen (Σ NWF × 1.10, FWS Folie 33) oder manuell; nicht raumweise erfasster Rest über Hüllflächen oder Φ'·A.
 *
 * Einheiten: W, W/K, m², m³, °C, K, h⁻¹. Daten kommen als Parameter (sia384-2.json, fws.json).
 */
import type { FwsDaten } from '../daten/fws';
import type { BuFlaechen, BuLage, Dichtheit, Lueftungskonzept, Sia3842Daten } from '../daten/sia384';
import { bauperiodeBandWm2 } from './fws';
import type { BauteilArt, BauteilU, HuelleErgebnis } from './huelle';
import type { Gebaeudetyp } from './typen';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fallback, fmt, override, sammleAnnahmen, schaetzung, tabelle, unsicherheitSumme } from './wert';

export type UnbeheiztSituation = 'keller' | 'dachraum' | 'garage' | 'treppenhaus' | 'nebenraum';

export type Anschluss =
  | { art: 'aussen' }
  | { art: 'unbeheizt'; situation?: UnbeheiztSituation; nd3?: { lage: BuLage; flaechen: BuFlaechen; dicht: boolean }; bU?: number; thetaNachbarC?: number }
  | { art: 'erdreich'; tiefeM?: number }
  | { art: 'beheizt'; thetaNachbarC?: number; andereEinheit?: boolean }
  | { art: 'faktor'; f: number; zaehltZurHuelle?: boolean };

export interface RaumBauteilEingabe {
  id?: string;
  /** Referenz auf einen Gebäude-Bauteiltyp (huelle.ts); Hülle vererbt U. */
  typId?: string;
  /** Ohne typId: Bauteilart für Beschriftung/Rsi (z. B. Innenwand). */
  art?: BauteilArt;
  bezeichnung?: string;
  flaecheM2: number;
  anschluss: Anschluss;
  /** U manuell für dieses Raumbauteil (gewinnt über die Hülle, Herkunft «override»). */
  uOverride?: number;
}

export interface RaumEingabe {
  id: string;
  name: string;
  geschoss?: string;
  /** Raumtyp-Key aus sia384-2.json innentemperaturen (wohnen, bad, flur, …). */
  typ: string;
  flaecheM2?: number;
  laengeM?: number;
  breiteM?: number;
  hoeheM?: number;
  /** Solltemperatur manuell [°C]. */
  thetaIntC?: number;
  /** Mindestluftwechsel manuell [h⁻¹]. */
  nMinOverride?: number;
  /** Bei Lüftungsanlage: Raum mit Zuluft. */
  zuluft?: boolean;
  /** Raum mit Aussenbezug (Fenster/Aussenwand); ohne Angabe aus den Bauteilen abgeleitet. */
  aussenbezug?: boolean;
  beheizt?: boolean;
  /** Zählt zur EBF (Default: beheizt). */
  inEbf?: boolean;
  bauteile: RaumBauteilEingabe[];
}

export type RestEingabe =
  | { modus: 'keiner' }
  | {
      modus: 'huellflaechen';
      /** Grundfläche des Rests [m²] (für EBF/Volumen). */
      flaecheM2?: number;
      volumenM3?: number;
      aAussenwandM2?: number;
      aFensterM2?: number;
      aTuerM2?: number;
      aDachM2?: number;
      aDeckeEstrichM2?: number;
      aBodenM2?: number;
      bodenAnschluss?: 'keller' | 'erdreich';
      thetaIntC?: number;
      /** Bauteiltyp-IDs je Fläche; ohne Angabe erster Typ passender Art. */
      typIds?: Partial<Record<'aussenwand' | 'fenster' | 'tuer' | 'dach' | 'decke' | 'boden', string>>;
    }
  | { modus: 'spezifisch'; flaecheM2?: number; phiSpezWm2?: number };

export interface RaumweiseEingabe {
  /** Auslegungs-Aussentemperatur [°C] (klima.ts). */
  thetaE: Wert;
  /** Jahresmittel [°C] für f_g2 (klima.ts); ohne Angabe Standardwert. */
  thetaMittelJahr?: Wert;
  huelle: HuelleErgebnis;
  baujahr: number;
  gebaeudetyp?: Gebaeudetyp;
  lueftung?: { konzept?: Lueftungskonzept; dichtheit?: Dichtheit; fensterErsetzt?: boolean };
  waermebruecken?: { key?: 'bestand' | 'neubau' | 'nachweis'; deltaU?: number };
  erdreich?: { bodenflaecheM2?: number; umfangM?: number; bStrichM?: number; grundwasserNah?: boolean; wandDickeM?: number; boden?: 'default' | 'tonLehm' | 'sandKies' };
  geschosshoeheM?: number;
  raeume: RaumEingabe[];
  ebf?: { modus?: 'raeume' | 'manuell'; manuellM2?: number; faktorNwfZuEbf?: number };
  rest?: RestEingabe;
}

export interface BauteilErgebnis {
  id: string;
  bezeichnung: string;
  art: BauteilArt | 'unbekannt';
  anschluss: Anschluss['art'];
  u: Wert;
  deltaUWb: Wert;
  flaeche: Wert;
  /** Temperaturfaktor f (1, b_u, Nachbar, Erdreich). */
  faktor: Wert;
  hT: Wert;
  phiT: Wert;
  /** Zählt zur Gebäudehülle (saldierte Gebäude-Heizlast). */
  zaehltZurHuelle: boolean;
}

export interface RaumErgebnis {
  id: string;
  name: string;
  geschoss: string | null;
  typ: string;
  typLabel: string;
  beheizt: boolean;
  inEbf: boolean;
  thetaInt: Wert;
  flaeche: Wert;
  hoehe: Wert;
  volumen: Wert;
  nMin: Wert;
  bauteile: BauteilErgebnis[];
  hT: Wert;
  phiT: Wert;
  hV: Wert;
  phiV: Wert;
  /** Φ_HL des Raums (Heizflächen) [W]; kann bei Innengewinnen negativ sein. */
  phiHL: Wert;
  /** Anteil des Raums an der saldierten Gebäude-Heizlast [W] (nur Hülle + Lüftung). */
  phiHuelle: Wert;
  phiSpez: Wert;
  hinweise: Hinweis[];
}

export interface RestErgebnis {
  modus: 'huellflaechen' | 'spezifisch';
  flaeche: Wert;
  phiHL: Wert;
  bauteile: BauteilErgebnis[];
  phiV: Wert | null;
  hinweise: Hinweis[];
}

export interface RaumweiseErgebnis {
  methode: string;
  thetaE: Wert;
  deltaUWb: Wert;
  nMinDichtheit: Dichtheit;
  lueftungskonzept: Lueftungskonzept;
  raeume: RaumErgebnis[];
  /** Σ Φ_HL der beheizten Räume [W] (für Heizflächen). */
  summeRaeume: Wert;
  /** Saldierte Gebäude-Heizlast der erfassten Räume [W] (nur Hülle + Lüftung). */
  saldiertRaeume: Wert;
  rest: RestErgebnis | null;
  /** Massgebende Gebäude-Heizlast = saldiert + Rest [W]. */
  gebaeude: Wert;
  /** Σ Räume + Rest [W]. */
  summeMitRest: Wert;
  ebf: Wert;
  /** Gebäude-Heizlast je m² EBF [W/m²]. */
  spezifisch: Wert;
  /** (Σ Räume − saldiert)/saldiert [%]. */
  innentransmissionAnteil: Wert;
  erdreich: { bStrich: Wert | null; faktor: Wert | null; uEquivBeispiel: Wert | null };
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
  vollstaendig: boolean;
}

const Q_METHODE = 'SIA 384/2:2020 (SN EN 12831-1:2017), sia384-2.json';
const Q_NMIN = 'SN EN 12831-1/C1:2020 Tabelle NA.7 (Mindest-Luftwechselrate), gültig mit SIA 384/2:2020';
const Q_BU = 'SIA 384.201-C1:2014 Tabelle ND.3 (Reduktionsfaktor b_u)';
const Q_THETA = 'SIA 384.201 ND.2 / SIA 2024 Tab. 11; Bad 22 °C, Flur 20 °C, Eingangsbereich 15 °C (Entscheid Daniel 2026-10-29)';
const Q_ERDREICH = 'ISO 13370 (U_equiv Bodenplatte) mit f_g1/f_g2/f_GW nach EN 12831/SIA 384.201; SIA 384/2 Anhang B nicht öffentlich (Annahme)';

/* ---------------------------------------------------------------------------------------------- */
/* Hilfsfunktionen                                                                                 */
/* ---------------------------------------------------------------------------------------------- */

/** Kurzbezeichnung des Lüftungskonzepts für Begründungen und Bericht (sia384-2.json `kurz`). */
export function konzeptKurz(key: Lueftungskonzept, daten: Sia3842Daten): string {
  return daten.nMin.lueftungskonzepte.find((k) => k.key === key)?.kurz ?? key;
}

export function raumtyp(key: string, daten: Sia3842Daten) {
  return daten.innentemperaturen.raumtypen.find((r) => r.key === key);
}

/** Dichtheit für n_min («altbau» = +0.2): Baujahr < 1995 und Fenster nicht ersetzt → altbau (Thermowerk-Default). */
export function dichtheitDefault(baujahr: number, fensterErsetzt: boolean): Dichtheit {
  return baujahr < 1995 && !fensterErsetzt ? 'altbau' : 'neubau';
}

function fensterErsetztAusHuelle(h: HuelleErgebnis): boolean {
  return Object.values(h.bauteile).some((b) => b.art === 'fenster' && b.sanierungWirkt);
}

/** n_min [h⁻¹] je Raum aus Tabelle NA.7. */
export function nMinFuerRaum(r: { typ: string; zuluft?: boolean | undefined; aussenbezug: boolean }, konzept: Lueftungskonzept, dichtheit: Dichtheit, daten: Sia3842Daten): { wert: number; nminTyp: string } {
  const zu = daten.nMin.zuordnungRaumtypZuNmin[r.typ];
  const map = typeof zu === 'string' ? zu : 'weitere';
  let key: string;
  if (konzept === 'wrg') key = r.zuluft ? 'mitZuluft' : map === 'ohneAussenbezug' && !r.aussenbezug ? 'ohneAussenbezug' : 'ohneZuluftDurchstroemt';
  else key = map === 'ohneAussenbezug' && r.aussenbezug ? 'weitere' : map;
  const zeile = daten.nMin.tabelle[konzept]?.[key] ?? daten.nMin.tabelle[konzept]?.weitere ?? daten.nMin.tabelle.natuerlich!.weitere!;
  return { wert: zeile[dichtheit], nminTyp: key };
}

/** b_u aus Tabelle ND.3 bzw. Situations-Default. */
export function bUFuer(a: Extract<Anschluss, { art: 'unbeheizt' }>, daten: Sia3842Daten): { wert: number; text: string } {
  const d = daten.bU.defaults;
  if (a.nd3) {
    const t = daten.bU.tabelleND3;
    const lage = t[a.nd3.lage];
    const zeile = (lage as Record<string, { dicht: number; undicht: number } | string>)[a.nd3.flaechen] ?? (lage as { eineFlaeche: { dicht: number; undicht: number } }).eineFlaeche;
    const z = typeof zeile === 'string' ? (lage as { eineFlaeche: { dicht: number; undicht: number } }).eineFlaeche : zeile;
    const w = a.nd3.dicht ? z.dicht : z.undicht;
    return { wert: w, text: `ND.3 ${a.nd3.lage}, ${a.nd3.flaechen}, ${a.nd3.dicht ? 'dicht' : 'undicht'}` };
  }
  switch (a.situation) {
    case 'keller':
      return { wert: d.kellerUnbeheizt, text: d.kellerUnbeheiztHinweis };
    case 'dachraum':
      return { wert: d.dachraumUnbeheizt, text: d.dachraumUnbeheiztHinweis };
    case 'garage':
      return { wert: d.garageUnbeheizt, text: d.garageUnbeheiztHinweis };
    case 'treppenhaus':
      return { wert: d.treppenhausUnbeheizt, text: d.treppenhausUnbeheiztHinweis };
    default:
      return { wert: d.garageUnbeheizt, text: 'ND.3 seitlich, eine Fläche gegen beheizt, undicht (Nebenraum)' };
  }
}

/** U_equiv,bf der Bodenplatte nach ISO 13370 (vereinfachtes Verfahren EN 12831-1 / SIA 384/2 Anhang B). */
export function uEquivBodenplatte(uBoden: number, bStrichM: number, o: { lambdaErde: number; wandDickeM: number; rsi: number; rse: number; rseVerwendetInU: number }): { uEquiv: number; rf: number; dt: number } {
  const rf = Math.max(0, 1 / Math.max(uBoden, 1e-6) - o.rsi - o.rseVerwendetInU);
  const dt = o.wandDickeM + o.lambdaErde * (o.rsi + rf + o.rse);
  const b = Math.max(bStrichM, 0.5);
  const uEquiv = dt < b ? ((2 * o.lambdaErde) / (Math.PI * b + dt)) * Math.log((Math.PI * b) / dt + 1) : o.lambdaErde / (0.457 * b + dt);
  return { uEquiv, rf, dt };
}

export function flaecheAus(r: { flaecheM2?: number | undefined; laengeM?: number | undefined; breiteM?: number | undefined }): number | null {
  if (r.flaecheM2 !== undefined && Number.isFinite(r.flaecheM2) && r.flaecheM2 > 0) return r.flaecheM2;
  if (r.laengeM !== undefined && r.breiteM !== undefined && r.laengeM > 0 && r.breiteM > 0) return r.laengeM * r.breiteM;
  return null;
}

interface Kontext {
  thetaE: Wert;
  thetaMittel: Wert;
  deltaUWb: Wert;
  konzept: Lueftungskonzept;
  dichtheit: Dichtheit;
  huelle: HuelleErgebnis;
  erdreich: { bStrich: Wert | null; faktorBasis: { fG1: number; fGw: number; fGwText: string }; lambda: number; wandDicke: number; annahmen: Wert<unknown>[] };
  geschosshoehe: Wert;
  sia: Sia3842Daten;
}

function huelleTyp(ctx: Kontext, typId: string | undefined): BauteilU | null {
  if (!typId) return null;
  return ctx.huelle.bauteile[typId] ?? null;
}

function bauteilAufloesen(b: RaumBauteilEingabe, idx: number, thetaInt: Wert, ctx: Kontext, hinweise: Hinweis[], pfad: string): BauteilErgebnis {
  const sia = ctx.sia;
  const id = b.id ?? `b${idx + 1}`;
  const typ = huelleTyp(ctx, b.typId);
  if (b.typId && !typ) hinweise.push({ stufe: 'fehler', code: 'raum.typFehlt', text: `Bauteiltyp «${b.typId}» existiert nicht in der Hülle.`, pfad: `${pfad}.typId` });
  const art: BauteilArt | 'unbekannt' = typ?.art ?? b.art ?? 'unbekannt';
  const bezeichnung = b.bezeichnung ?? typ?.bezeichnung ?? art;
  const dT = thetaInt.wert - ctx.thetaE.wert;

  // U: Override → Hülle (Vererbung) → Fehler
  let u: Wert;
  if (b.uOverride !== undefined && Number.isFinite(b.uOverride) && b.uOverride > 0) {
    u = override(b.uOverride, 'W/m²K', typ ? `U ${fmt(b.uOverride, 2)} W/m²K manuell für dieses Bauteil (Hülle: ${fmt(typ.u.wert, 2)})` : `U ${fmt(b.uOverride, 2)} W/m²K manuell`);
  } else if (typ) {
    u = { ...typ.u, begruendung: `aus Hülle «${typ.bezeichnung}»: ${typ.u.begruendung}` };
  } else {
    u = fallback(1, 'W/m²K', `U fehlt (kein Bauteiltyp, kein Wert) — 1.0 W/m²K angenommen`, { stufe: 'fehlt', unsicherheit: 100 });
    hinweise.push({ stufe: 'fehler', code: 'raum.uFehlt', text: `Bauteil «${bezeichnung}»: weder Bauteiltyp noch U-Wert angegeben.`, pfad: `${pfad}` });
  }

  const flaeche = eingabe(Math.max(0, b.flaecheM2 || 0), 'm²', `Fläche ${fmt(b.flaecheM2 || 0, 2)} m²`);
  if (!(b.flaecheM2 > 0)) hinweise.push({ stufe: 'warnung', code: 'raum.flaecheNull', text: `Bauteil «${bezeichnung}»: Fläche fehlt oder 0.`, pfad: `${pfad}.flaecheM2` });

  let faktor: Wert;
  let zaehltZurHuelle = true;
  let uEff: Wert = u;
  const a = b.anschluss;
  switch (a.art) {
    case 'aussen':
      faktor = berechnet(1, '', 'f = 1 (Aussenluft)', [], { quelle: Q_METHODE });
      break;
    case 'unbeheizt': {
      if (a.bU !== undefined && Number.isFinite(a.bU)) {
        faktor = override(a.bU, '', `b_u ${fmt(a.bU, 2)} manuell (unbeheizter Nachbarraum)`);
      } else if (a.thetaNachbarC !== undefined && Number.isFinite(a.thetaNachbarC)) {
        const f = dT !== 0 ? (thetaInt.wert - a.thetaNachbarC) / dT : 0;
        faktor = berechnet(f, '', `f = (θint − θu)/(θint − θe) = (${fmt(thetaInt.wert, 0)} − ${fmt(a.thetaNachbarC, 0)})/(${fmt(thetaInt.wert, 0)} − (${fmt(ctx.thetaE.wert, 0)})) = ${fmt(f, 3)} (unbeheizt, Temperatur bekannt)`, [thetaInt, ctx.thetaE], { quelle: Q_METHODE });
      } else {
        const bu = bUFuer(a, sia);
        faktor = tabelle(bu.wert, '', `b_u ${fmt(bu.wert, 2)} (${bu.text})`, Q_BU, { stufe: a.situation ?? 'nd3', unsicherheit: 25 });
      }
      break;
    }
    case 'erdreich': {
      const istBoden = art === 'bodenErdreich' || art === 'bodenKeller' || art === 'innendecke';
      const e = ctx.erdreich;
      const fG2 = dT !== 0 ? Math.max(0, Math.min(1, (thetaInt.wert - ctx.thetaMittel.wert) / dT)) : 0;
      const f = e.faktorBasis.fG1 * fG2 * e.faktorBasis.fGw;
      if (istBoden) {
        const bStrich = e.bStrich?.wert ?? sia.erdreich.formelIso13370.bStrichDefaultM;
        const rseVerwendet = art === 'bodenKeller' ? sia.erdreich.formelIso13370.rsiAbwaerts : 0;
        const ue = uEquivBodenplatte(u.wert, bStrich, { lambdaErde: e.lambda, wandDickeM: e.wandDicke, rsi: sia.erdreich.formelIso13370.rsiAbwaerts, rse: sia.erdreich.formelIso13370.rseErdreichOberflaeche, rseVerwendetInU: rseVerwendet });
        uEff = berechnet(ue.uEquiv, 'W/m²K', `U_equiv = ISO 13370 (B' ${fmt(bStrich, 2)} m, R_f ${fmt(ue.rf, 2)} m²K/W aus U_Boden ${fmt(u.wert, 2)}, λ_Erde ${fmt(e.lambda, 1)}, Wand ${fmt(e.wandDicke, 2)} m) = ${fmt(ue.uEquiv, 3)} W/m²K`, [u, e.bStrich], { quelle: Q_ERDREICH });
      } else {
        const tiefe = a.tiefeM ?? 1.5;
        const grenze = sia.erdreich.einfacheRegel.tiefeGrenzeM;
        if (tiefe < grenze) {
          faktor = fallback(1, '', `f = 1: Bauteil gegen Erdreich < ${fmt(grenze, 0)} m Tiefe wie Aussenklima (SIA 380/1 Figur 2)${a.tiefeM === undefined ? ' — Tiefe nicht angegeben, 1.5 m angenommen' : ''}`, { stufe: a.tiefeM === undefined ? 'standardwert' : 'einfacheRegel', quelle: 'SIA 380/1 Figur 2 (LU-C Folie 25)' });
          break;
        }
        const bu = sia.bU.defaults.kellerUnbeheizt;
        faktor = tabelle(bu, '', `b ${fmt(bu, 2)}: Bauteil gegen Erdreich > ${fmt(grenze, 0)} m Tiefe wie gegen unbeheizt (SIA 380/1 Figur 2, b_u Keller)`, Q_BU, { stufe: 'einfacheRegel', unsicherheit: 30 });
        break;
      }
      faktor = schaetzung(f, '', `f = f_g1 · f_g2 · f_GW = ${fmt(e.faktorBasis.fG1, 2)} × ${fmt(fG2, 3)} × ${fmt(e.faktorBasis.fGw, 2)} = ${fmt(f, 3)} (f_g2 = (θint ${fmt(thetaInt.wert, 0)} − θm,e ${fmt(ctx.thetaMittel.wert, 1)})/(θint − θe)${e.faktorBasis.fGwText})`, { stufe: 'erdreich', unsicherheit: 20, quelle: Q_ERDREICH });
      break;
    }
    case 'beheizt': {
      if (a.thetaNachbarC === undefined || !Number.isFinite(a.thetaNachbarC) || a.thetaNachbarC === thetaInt.wert) {
        faktor = berechnet(0, '', 'f = 0 (beheizter Nachbarraum gleicher Temperatur)', [], { quelle: Q_METHODE });
      } else {
        const f = dT !== 0 ? (thetaInt.wert - a.thetaNachbarC) / dT : 0;
        faktor = berechnet(f, '', `f = (θint − θnb)/(θint − θe) = (${fmt(thetaInt.wert, 0)} − ${fmt(a.thetaNachbarC, 0)})/(${fmt(thetaInt.wert, 0)} − (${fmt(ctx.thetaE.wert, 0)})) = ${fmt(f, 3)}`, [thetaInt, ctx.thetaE], { quelle: Q_METHODE });
      }
      zaehltZurHuelle = !!a.andereEinheit;
      break;
    }
    case 'faktor':
      faktor = eingabe(a.f, '', `f = ${fmt(a.f, 3)} (Eingabe)`);
      zaehltZurHuelle = a.zaehltZurHuelle ?? true;
      break;
    default:
      faktor = berechnet(1, '', 'f = 1', [], { quelle: Q_METHODE });
  }

  const deltaUWb = zaehltZurHuelle ? ctx.deltaUWb : berechnet(0, 'W/m²K', 'ΔU_WB 0 (Innenbauteil)', [], { quelle: Q_METHODE });
  const hTW = (uEff.wert + deltaUWb.wert) * flaeche.wert * faktor.wert;
  const hT = berechnet(hTW, 'W/K', `H_T = (U ${fmt(uEff.wert, 2)} + ΔU_WB ${fmt(deltaUWb.wert, 2)}) × ${fmt(flaeche.wert, 2)} m² × f ${fmt(faktor.wert, 3)} = ${fmt(hTW, 2)} W/K`, [uEff, deltaUWb, faktor], { quelle: Q_METHODE });
  const phiTW = hTW * dT;
  const phiT = berechnet(phiTW, 'W', `Φ_T = ${fmt(hTW, 2)} W/K × (${fmt(thetaInt.wert, 0)} − (${fmt(ctx.thetaE.wert, 0)})) K = ${fmt(phiTW, 0)} W`, [hT], { quelle: Q_METHODE });
  return { id, bezeichnung, art, anschluss: a.art, u: uEff, deltaUWb, flaeche, faktor, hT, phiT, zaehltZurHuelle };
}

function raumAufloesen(r: RaumEingabe, ctx: Kontext, gesamtHinweise: Hinweis[]): RaumErgebnis {
  const sia = ctx.sia;
  const hinweise: Hinweis[] = [];
  const pfad = `raeume.${r.id}`;
  const rt = raumtyp(r.typ, sia);
  if (!rt) hinweise.push({ stufe: 'warnung', code: 'raum.typUnbekannt', text: `Raumtyp «${r.typ}» unbekannt — wie «Wohnen» (20 °C) behandelt.`, pfad: `${pfad}.typ` });
  const typLabel = rt?.label ?? r.typ;
  const beheizt = r.beheizt ?? rt?.beheizt ?? true;
  const inEbf = r.inEbf ?? beheizt;

  const thetaInt = r.thetaIntC !== undefined && Number.isFinite(r.thetaIntC) ? override(r.thetaIntC, '°C', `θint ${fmt(r.thetaIntC, 0)} °C manuell (Standard ${typLabel}: ${fmt(rt?.thetaIntC ?? 20, 0)} °C)`) : tabelle(rt?.thetaIntC ?? 20, '°C', `θint ${fmt(rt?.thetaIntC ?? 20, 0)} °C Standardwert für ${typLabel}`, Q_THETA, { stufe: 'standardwert' });

  const fl = flaecheAus(r);
  const flaeche = fl !== null ? eingabe(fl, 'm²', r.flaecheM2 !== undefined ? `Fläche ${fmt(fl, 2)} m²` : `Fläche ${fmt(r.laengeM!, 2)} × ${fmt(r.breiteM!, 2)} = ${fmt(fl, 2)} m²`) : eingabe(0, 'm²', 'Fläche fehlt');
  if (fl === null) hinweise.push({ stufe: 'fehler', code: 'raum.flaecheFehlt', text: `Raum «${r.name}»: Fläche oder Länge × Breite angeben.`, pfad: `${pfad}.flaecheM2` });
  const hoehe = r.hoeheM !== undefined && Number.isFinite(r.hoeheM) && r.hoeheM > 0 ? eingabe(r.hoeheM, 'm', `Raumhöhe ${fmt(r.hoeheM, 2)} m`) : { ...ctx.geschosshoehe };
  if (hoehe.wert >= sia.methode.hoheRaeumeAbM) hinweise.push({ stufe: 'warnung', code: 'raum.hoherRaum', text: `Raum «${r.name}» ist ${fmt(hoehe.wert, 1)} m hoch — ${sia.methode.hoheRaeumeHinweis}`, pfad: `${pfad}.hoeheM` });
  const volW = flaeche.wert * hoehe.wert;
  const volumen = berechnet(volW, 'm³', `V = ${fmt(flaeche.wert, 2)} m² × ${fmt(hoehe.wert, 2)} m = ${fmt(volW, 1)} m³`, [flaeche, hoehe], { quelle: Q_METHODE });

  // Aussenbezug (für n_min «Raum ohne Aussenbezug»): Fenster, Aussentür oder Aussenwand nach aussen; ein Dach allein zählt nicht.
  const aussenbezug = r.aussenbezug ?? r.bauteile.some((b) => b.anschluss.art === 'aussen' && ['fenster', 'tuer', 'aussenwand'].includes(huelleTyp(ctx, b.typId)?.art ?? b.art ?? ''));
  const bauteile = r.bauteile.map((b, i) => bauteilAufloesen(b, i, thetaInt, ctx, hinweise, `${pfad}.bauteile.${b.id ?? i}`));
  const dT = thetaInt.wert - ctx.thetaE.wert;

  const hTW = bauteile.reduce((s, b) => s + b.hT.wert, 0);
  const hT = berechnet(hTW, 'W/K', `Σ H_T = ${bauteile.map((b) => fmt(b.hT.wert, 2)).join(' + ') || '0'} = ${fmt(hTW, 2)} W/K`, bauteile.map((b) => b.hT), { quelle: Q_METHODE, unsicherheit: unsicherheitSumme(bauteile.map((b) => b.hT)) ?? 0 });
  const phiTW = hTW * dT;
  const phiT = berechnet(phiTW, 'W', `Φ_T = ${fmt(hTW, 2)} W/K × ${fmt(dT, 0)} K = ${fmt(phiTW, 0)} W`, [hT], { quelle: Q_METHODE });

  let nMin: Wert;
  if (r.nMinOverride !== undefined && Number.isFinite(r.nMinOverride)) {
    nMin = override(r.nMinOverride, 'h⁻¹', `n_min ${fmt(r.nMinOverride, 2)} h⁻¹ manuell`);
  } else {
    const n = nMinFuerRaum({ typ: r.typ, zuluft: r.zuluft, aussenbezug }, ctx.konzept, ctx.dichtheit, sia);
    nMin = tabelle(n.wert, 'h⁻¹', `n_min ${fmt(n.wert, 2)} h⁻¹ (Tabelle NA.7: ${konzeptKurz(ctx.konzept, sia)}, ${(sia.nMin.raumtypen.find((x) => x.key === n.nminTyp)?.label ?? n.nminTyp).split(' (')[0]}, ${ctx.dichtheit === 'altbau' ? 'Bestand ohne Luftdichtheitsnachweis' : 'Neubau-Dichtheit'})`, Q_NMIN, { stufe: 'tabelle_na7', unsicherheit: 30 });
  }
  const cp = sia.methode.luftWaermekapazitaetWhM3K;
  const hVW = volumen.wert * nMin.wert * cp;
  const hV = berechnet(hVW, 'W/K', `H_V = ${fmt(volumen.wert, 1)} m³ × ${fmt(nMin.wert, 2)} h⁻¹ × ${fmt(cp, 2)} Wh/(m³K) = ${fmt(hVW, 2)} W/K`, [volumen, nMin], { quelle: Q_METHODE });
  const phiVW = hVW * dT;
  const phiV = berechnet(phiVW, 'W', `Φ_V = ${fmt(hVW, 2)} W/K × ${fmt(dT, 0)} K = ${fmt(phiVW, 0)} W`, [hV], { quelle: Q_METHODE });

  const phiHLW = beheizt ? phiTW + phiVW : 0;
  const phiHL = berechnet(phiHLW, 'W', beheizt ? `Φ_HL = Φ_T ${fmt(phiTW, 0)} + Φ_V ${fmt(phiVW, 0)} = ${fmt(phiHLW, 0)} W` : 'unbeheizter Raum: keine Heizlast', [phiT, phiV], { quelle: Q_METHODE });
  const phiHuelleW = beheizt ? bauteile.filter((b) => b.zaehltZurHuelle).reduce((s, b) => s + b.phiT.wert, 0) + phiVW : 0;
  const phiHuelle = berechnet(phiHuelleW, 'W', beheizt ? `Anteil Gebäudehülle = Σ Φ_T (aussen/unbeheizt/Erdreich) ${fmt(phiHuelleW - phiVW, 0)} + Φ_V ${fmt(phiVW, 0)} = ${fmt(phiHuelleW, 0)} W` : 'unbeheizt', [phiHL], { quelle: Q_METHODE });
  const phiSpez = berechnet(flaeche.wert > 0 ? phiHLW / flaeche.wert : 0, 'W/m²', `${fmt(phiHLW, 0)} W / ${fmt(flaeche.wert, 2)} m² = ${fmt(flaeche.wert > 0 ? phiHLW / flaeche.wert : 0, 1)} W/m²`, [phiHL], { quelle: Q_METHODE });
  if (beheizt && phiHLW < 0) hinweise.push({ stufe: 'info', code: 'raum.negativ', text: `Raum «${r.name}»: Φ_HL ${fmt(phiHLW, 0)} W negativ — Wärmegewinn von wärmeren Nachbarräumen, keine Heizfläche nötig.`, pfad });
  if (beheizt && !r.bauteile.length) hinweise.push({ stufe: 'warnung', code: 'raum.ohneBauteile', text: `Raum «${r.name}» hat keine Bauteile — nur Lüftungsanteil gerechnet.`, pfad: `${pfad}.bauteile` });
  gesamtHinweise.push(...hinweise);
  return { id: r.id, name: r.name, geschoss: r.geschoss ?? null, typ: r.typ, typLabel, beheizt, inEbf, thetaInt, flaeche, hoehe, volumen, nMin, bauteile, hT, phiT, hV, phiV, phiHL, phiHuelle, phiSpez, hinweise };
}

/* ---------------------------------------------------------------------------------------------- */
/* Rest, EBF                                                                                        */
/* ---------------------------------------------------------------------------------------------- */

function erstesTyp(ctx: Kontext, arten: BauteilArt[], typId?: string): BauteilU | null {
  if (typId) return ctx.huelle.bauteile[typId] ?? null;
  for (const a of arten) {
    const t = Object.values(ctx.huelle.bauteile).find((b) => b.art === a);
    if (t) return t;
  }
  return null;
}

function restAufloesen(rest: RestEingabe, e: RaumweiseEingabe, ctx: Kontext, summeFlaecheRaeume: number, ebfManuell: number | null, fws: FwsDaten): RestErgebnis | null {
  const sia = ctx.sia;
  const hinweise: Hinweis[] = [];
  if (rest.modus === 'keiner') return null;
  const faktor = e.ebf?.faktorNwfZuEbf ?? fws.ebf.faktorNwfZuEbf.typ;
  let flaeche: Wert;
  if (rest.flaecheM2 !== undefined && Number.isFinite(rest.flaecheM2) && rest.flaecheM2 >= 0) {
    flaeche = eingabe(rest.flaecheM2, 'm²', `Restfläche ${fmt(rest.flaecheM2, 0)} m² (Eingabe)`);
  } else if (ebfManuell !== null) {
    const w = Math.max(0, ebfManuell - summeFlaecheRaeume * faktor);
    flaeche = schaetzung(w, 'm²', `Restfläche = EBF ${fmt(ebfManuell, 0)} − Σ Räume ${fmt(summeFlaecheRaeume, 0)} m² × ${fmt(faktor, 2)} = ${fmt(w, 0)} m² (Standardwert)`, { stufe: 'standardwert', unsicherheit: 20 });
  } else {
    flaeche = eingabe(0, 'm²', 'Restfläche fehlt');
    hinweise.push({ stufe: 'fehler', code: 'rest.flaecheFehlt', text: 'Nicht raumweise erfasster Rest: Fläche angeben (oder EBF manuell).', pfad: 'rest.flaecheM2' });
  }

  if (rest.modus === 'spezifisch') {
    let phiSpez: Wert;
    if (rest.phiSpezWm2 !== undefined && Number.isFinite(rest.phiSpezWm2)) {
      phiSpez = override(rest.phiSpezWm2, 'W/m²', `Φ' ${fmt(rest.phiSpezWm2, 0)} W/m² manuell`);
    } else {
      const band = bauperiodeBandWm2(e.baujahr, e.gebaeudetyp ?? 'efh', fws);
      const mitte = band ? (band.band[0] + band.band[1]) / 2 : 50;
      phiSpez = schaetzung(mitte, 'W/m²', `Φ' ≈ ${fmt(mitte, 0)} W/m² (Mitte des Bandes ${band ? `${band.band[0]}–${band.band[1]} W/m², ${band.label} ${(e.gebaeudetyp ?? 'efh').toUpperCase()}` : 'ohne Band'}, FWS Folie 37) — grobe Schätzung ohne Geometrie`, {
        stufe: 'bauperiode',
        band: band ? [band.band[0], band.band[1]] : undefined,
        unsicherheit: band ? Math.round(((band.band[1] - band.band[0]) / 2 / mitte) * 100) : 50,
        quelle: 'FWS M3 Folie 37 (Schneider 2014), fws.json bauperioden.wM2',
      });
    }
    const w = phiSpez.wert * flaeche.wert;
    const phiHL = berechnet(w, 'W', `Rest Φ = Φ' ${fmt(phiSpez.wert, 0)} W/m² × ${fmt(flaeche.wert, 0)} m² = ${fmt(w, 0)} W (Schätzung, nicht raumweise)`, [phiSpez, flaeche], { quelle: 'FWS M3 Folie 37' });
    hinweise.push({ stufe: 'info', code: 'rest.schaetzung', text: `Nicht raumweise erfasster Rest (${fmt(flaeche.wert, 0)} m²) als Φ'·A geschätzt — nur grob; Hüllflächen eingeben für bessere Genauigkeit.`, pfad: 'rest' });
    return { modus: 'spezifisch', flaeche, phiHL, bauteile: [], phiV: null, hinweise };
  }

  // Hüllflächen-Rest: Bauteile mit Hüllen-U, θint Standard, Lüftung «weitere»
  const thetaInt = rest.thetaIntC !== undefined ? override(rest.thetaIntC, '°C', `θint ${fmt(rest.thetaIntC, 0)} °C manuell (Rest)`) : tabelle(20, '°C', 'θint 20 °C Standardwert (Rest, Wohnen)', Q_THETA, { stufe: 'standardwert' });
  const bt: RaumBauteilEingabe[] = [];
  const push = (typ: BauteilU | null, a: number | undefined, anschluss: Anschluss, label: string) => {
    if (!typ || a === undefined || !(a > 0)) return;
    bt.push({ id: `rest_${label}`, typId: typ.typId, bezeichnung: `Rest: ${typ.bezeichnung}`, flaecheM2: a, anschluss });
  };
  push(erstesTyp(ctx, ['aussenwand'], rest.typIds?.aussenwand), rest.aAussenwandM2, { art: 'aussen' }, 'aw');
  push(erstesTyp(ctx, ['fenster'], rest.typIds?.fenster), rest.aFensterM2, { art: 'aussen' }, 'fenster');
  push(erstesTyp(ctx, ['tuer'], rest.typIds?.tuer), rest.aTuerM2, { art: 'aussen' }, 'tuer');
  push(erstesTyp(ctx, ['dachSteil', 'dachFlach'], rest.typIds?.dach), rest.aDachM2, { art: 'aussen' }, 'dach');
  push(erstesTyp(ctx, ['deckeEstrich'], rest.typIds?.decke), rest.aDeckeEstrichM2, { art: 'unbeheizt', situation: 'dachraum' }, 'decke');
  const bodenTyp = erstesTyp(ctx, rest.bodenAnschluss === 'erdreich' ? ['bodenErdreich', 'bodenKeller'] : ['bodenKeller', 'bodenErdreich'], rest.typIds?.boden);
  push(bodenTyp, rest.aBodenM2, rest.bodenAnschluss === 'erdreich' ? { art: 'erdreich' } : { art: 'unbeheizt', situation: 'keller' }, 'boden');
  const bauteile = bt.map((b, i) => bauteilAufloesen(b, i, thetaInt, ctx, hinweise, `rest.${b.id}`));
  const dT = thetaInt.wert - ctx.thetaE.wert;
  const phiTW = bauteile.reduce((s, b) => s + b.phiT.wert, 0);
  const volW = rest.volumenM3 ?? flaeche.wert * ctx.geschosshoehe.wert;
  const n = nMinFuerRaum({ typ: 'wohnen', aussenbezug: true }, ctx.konzept, ctx.dichtheit, sia);
  const nMin = tabelle(n.wert, 'h⁻¹', `n_min ${fmt(n.wert, 2)} h⁻¹ (Tabelle NA.7, Rest wie Wohnräume)`, Q_NMIN, { stufe: 'tabelle_na7', unsicherheit: 30 });
  const phiVW = volW * nMin.wert * sia.methode.luftWaermekapazitaetWhM3K * dT;
  const phiV = berechnet(phiVW, 'W', `Φ_V,Rest = ${fmt(volW, 0)} m³ × ${fmt(nMin.wert, 2)} × 0.34 × ${fmt(dT, 0)} K = ${fmt(phiVW, 0)} W`, [nMin], { quelle: Q_METHODE });
  const w = phiTW + phiVW;
  const phiHL = berechnet(w, 'W', `Rest Φ = Σ Φ_T ${fmt(phiTW, 0)} + Φ_V ${fmt(phiVW, 0)} = ${fmt(w, 0)} W (Hüllflächen-Eingabe, nicht raumweise)`, [...bauteile.map((b) => b.phiT), phiV], { quelle: Q_METHODE });
  if (!bauteile.length) hinweise.push({ stufe: 'warnung', code: 'rest.ohneFlaechen', text: 'Rest über Hüllflächen gewählt, aber keine Flächen angegeben — nur Lüftung gerechnet.', pfad: 'rest' });
  hinweise.push({ stufe: 'info', code: 'rest.huellflaechen', text: `Nicht raumweise erfasster Rest (${fmt(flaeche.wert, 0)} m²) aus Hüllflächen-Eingabe gerechnet (Schätzung: θint 20 °C, Lüftung wie Wohnraum).`, pfad: 'rest' });
  return { modus: 'huellflaechen', flaeche, phiHL, bauteile, phiV, hinweise };
}

/* ---------------------------------------------------------------------------------------------- */
/* Hauptfunktion                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Energiebezugsfläche (Session 4, als Funktion exportiert in Session 6 — gemeinsam für beide Modi):
 * manuell (Eingabe) oder Σ Nettoflächen der beheizten Räume × Faktor NWF→EBF (FWS Folie 33, Band 1.10–1.15).
 * `ebf` ist null, wenn weder Eingabe noch Raumflächen vorliegen.
 */
export function ebfBestimmen(e: { modus: 'raeume' | 'manuell'; manuellM2?: number | undefined; faktorNwfZuEbf?: number | undefined }, summeFlaecheRaeume: number, fws: FwsDaten): { ebf: Wert | null; hinweise: Hinweis[] } {
  const hinweise: Hinweis[] = [];
  const faktorEbf = e.faktorNwfZuEbf ?? fws.ebf.faktorNwfZuEbf.typ;
  const sp = fws.ebf.faktorNwfZuEbf.spanne;
  if (e.modus === 'manuell' && e.manuellM2 !== undefined && Number.isFinite(e.manuellM2) && e.manuellM2 > 0) {
    if (summeFlaecheRaeume * faktorEbf > e.manuellM2 * 1.05) hinweise.push({ stufe: 'warnung', code: 'ebf.kleinerAlsRaeume', text: `EBF ${fmt(e.manuellM2, 0)} m² ist kleiner als Σ Raumflächen × ${fmt(faktorEbf, 2)} = ${fmt(summeFlaecheRaeume * faktorEbf, 0)} m².`, pfad: 'ebf.manuellM2' });
    return { ebf: eingabe(e.manuellM2, 'm²', `EBF ${fmt(e.manuellM2, 0)} m² (Eingabe)`), hinweise };
  }
  if (e.modus === 'manuell') hinweise.push({ stufe: 'warnung', code: 'ebf.manuellFehlt', text: summeFlaecheRaeume > 0 ? 'EBF manuell gewählt, aber kein Wert — aus den Räumen geschätzt.' : 'EBF manuell gewählt, aber kein Wert.', pfad: 'ebf.manuellM2' });
  if (!(summeFlaecheRaeume > 0)) return { ebf: null, hinweise };
  const w = summeFlaecheRaeume * faktorEbf;
  const ebf = schaetzung(w, 'm²', `EBF ≈ Σ Nettoflächen der beheizten Räume ${fmt(summeFlaecheRaeume, 1)} m² × ${fmt(faktorEbf, 2)} (Wandanteil, FWS Folie 33) = ${fmt(w, 0)} m²`, {
    stufe: e.faktorNwfZuEbf !== undefined ? 'raeume_faktor' : 'raeume_standardfaktor',
    band: [summeFlaecheRaeume * (sp[0] ?? 1.1), summeFlaecheRaeume * (sp[1] ?? 1.15)],
    unsicherheit: 5,
    quelle: fws.ebf.fundstelle,
  });
  return { ebf, hinweise };
}

export function heizlastRaumweise(e: RaumweiseEingabe, daten: { sia: Sia3842Daten; fws: FwsDaten }): RaumweiseErgebnis {
  const sia = daten.sia;
  const hinweise: Hinweis[] = [];
  const annahmen: Wert<unknown>[] = [];

  // Wärmebrücken
  const wbKey = e.waermebruecken?.key ?? 'bestand';
  const wb = sia.deltaUWb.werte.find((w) => w.key === wbKey) ?? sia.deltaUWb.werte.find((w) => w.default)!;
  const deltaUWb = e.waermebruecken?.deltaU !== undefined && Number.isFinite(e.waermebruecken.deltaU)
    ? override(e.waermebruecken.deltaU, 'W/m²K', `ΔU_WB ${fmt(e.waermebruecken.deltaU, 2)} W/m²K manuell`)
    : tabelle(wb.deltaU, 'W/m²K', `ΔU_WB ${fmt(wb.deltaU, 2)} W/m²K pauschal (${wb.label})${e.waermebruecken?.key ? '' : ' — Standardwert'}`, 'DIN-Pauschale (Wissensbasis B Tab. 3.9) als Annahme; SIA 384/2 Wert nicht öffentlich', { stufe: e.waermebruecken?.key ? 'gewaehlt' : 'standardwert', unsicherheit: 50 });

  // Lüftung
  const konzept: Lueftungskonzept = e.lueftung?.konzept ?? 'natuerlich';
  const fensterErsetzt = e.lueftung?.fensterErsetzt ?? fensterErsetztAusHuelle(e.huelle);
  const dichtheit: Dichtheit = e.lueftung?.dichtheit ?? dichtheitDefault(e.baujahr, fensterErsetzt);
  if (!e.lueftung?.dichtheit) hinweise.push({ stufe: 'info', code: 'lueftung.dichtheitStandard', text: `Luftdichtheit für n_min: «${dichtheit === 'altbau' ? 'Bestand ohne Nachweis (+0.2 h⁻¹)' : 'Neubau-Grenzwerte erfüllt'}» angenommen (Baujahr ${e.baujahr}${fensterErsetzt ? ', Fenster ersetzt' : ''}).`, pfad: 'lueftung.dichtheit' });

  // Geschosshöhe
  const geschosshoehe = e.geschosshoeheM !== undefined && Number.isFinite(e.geschosshoeheM) && e.geschosshoeheM > 0 ? eingabe(e.geschosshoeheM, 'm', `Raumhöhe ${fmt(e.geschosshoeheM, 2)} m (Gebäude)`) : fallback(2.5, 'm', 'Raumhöhe 2.5 m Standardwert', { stufe: 'standardwert', unsicherheit: 10 });

  // Erdreich: B', Faktoren
  const er = e.erdreich ?? {};
  let bStrich: Wert | null = null;
  if (er.bStrichM !== undefined && Number.isFinite(er.bStrichM) && er.bStrichM > 0) bStrich = eingabe(er.bStrichM, 'm', `B' ${fmt(er.bStrichM, 2)} m (Eingabe)`);
  else if (er.bodenflaecheM2 !== undefined && er.umfangM !== undefined && er.bodenflaecheM2 > 0 && er.umfangM > 0) {
    const b = er.bodenflaecheM2 / (0.5 * er.umfangM);
    bStrich = berechnet(b, 'm', `B' = A_g/(0.5·P) = ${fmt(er.bodenflaecheM2, 1)}/(0.5 × ${fmt(er.umfangM, 1)}) = ${fmt(b, 2)} m`, [], { quelle: Q_ERDREICH });
  }
  const brauchtErdreich = e.raeume.some((r) => r.bauteile.some((b) => b.anschluss.art === 'erdreich')) || (e.rest?.modus === 'huellflaechen' && e.rest.bodenAnschluss === 'erdreich');
  if (brauchtErdreich && !bStrich) {
    const d = sia.erdreich.formelIso13370.bStrichDefaultM;
    bStrich = fallback(d, 'm', `B' ${fmt(d, 0)} m Standardwert — ${sia.erdreich.formelIso13370.bStrichDefaultHinweis}`, { stufe: 'standardwert', unsicherheit: 40, quelle: Q_ERDREICH });
  }
  const fGw = er.grundwasserNah ? sia.erdreich.fGw.grundwasserNah : sia.erdreich.fGw.default;
  const lambda = er.boden === 'tonLehm' ? sia.erdreich.lambdaErdreichWmK.tonLehm : er.boden === 'sandKies' ? sia.erdreich.lambdaErdreichWmK.sandKies : sia.erdreich.lambdaErdreichWmK.default;
  const wandDicke = er.wandDickeM ?? sia.erdreich.formelIso13370.wandDickeDefaultM;
  const thetaMittel = e.thetaMittelJahr ?? fallback(9, '°C', 'Jahresmittel 9 °C Standardwert (Mittelland) für f_g2', { stufe: 'standardwert', band: [8, 10] });

  const ctx: Kontext = {
    thetaE: e.thetaE,
    thetaMittel,
    deltaUWb,
    konzept,
    dichtheit,
    huelle: e.huelle,
    erdreich: { bStrich, faktorBasis: { fG1: sia.erdreich.faktoren.fG1, fGw, fGwText: er.grundwasserNah ? ', Grundwasser < 1 m' : '' }, lambda, wandDicke, annahmen: [] },
    geschosshoehe,
    sia,
  };

  // Räume
  const ids = new Set<string>();
  const raeume: RaumErgebnis[] = [];
  for (const r of e.raeume) {
    if (ids.has(r.id)) {
      hinweise.push({ stufe: 'fehler', code: 'raum.idDoppelt', text: `Raum-ID «${r.id}» ist doppelt.`, pfad: `raeume.${r.id}` });
      continue;
    }
    ids.add(r.id);
    raeume.push(raumAufloesen(r, ctx, hinweise));
  }
  const beheizt = raeume.filter((r) => r.beheizt);
  const summeW = beheizt.reduce((s, r) => s + r.phiHL.wert, 0);
  const summeRaeume = berechnet(summeW, 'W', `Σ Räume (Heizflächen) = ${beheizt.map((r) => `${r.name} ${fmt(r.phiHL.wert, 0)}`).join(' + ') || '0'} = ${fmt(summeW, 0)} W`, beheizt.map((r) => r.phiHL), { quelle: Q_METHODE, unsicherheit: unsicherheitSumme(beheizt.map((r) => r.phiHL)) ?? 0 });
  const saldW = beheizt.reduce((s, r) => s + r.phiHuelle.wert, 0);
  const saldiertRaeume = berechnet(saldW, 'W', `Gebäude-Heizlast saldiert (nur Hülle nach aussen/unbeheizt/Erdreich + Lüftung) = ${fmt(saldW, 0)} W; Innentransmission zwischen beheizten Räumen nicht gezählt`, beheizt.map((r) => r.phiHuelle), { quelle: Q_METHODE, unsicherheit: unsicherheitSumme(beheizt.map((r) => r.phiHuelle)) ?? 0 });

  // EBF
  const summeFlaeche = raeume.filter((r) => r.inEbf).reduce((s, r) => s + r.flaeche.wert, 0);
  const ebfModus = e.ebf?.modus ?? (e.ebf?.manuellM2 !== undefined ? 'manuell' : 'raeume');
  const ebfR = ebfBestimmen({ modus: ebfModus, manuellM2: e.ebf?.manuellM2, faktorNwfZuEbf: e.ebf?.faktorNwfZuEbf }, summeFlaeche, daten.fws);
  const ebf = ebfR.ebf ?? eingabe(0, 'm²', 'EBF fehlt');
  hinweise.push(...ebfR.hinweise);

  // Rest
  const rest = e.rest ? restAufloesen(e.rest, e, ctx, summeFlaeche, ebfModus === 'manuell' && e.ebf?.manuellM2 ? e.ebf.manuellM2 : null, daten.fws) : null;
  if (rest) hinweise.push(...rest.hinweise);
  const restW = rest?.phiHL.wert ?? 0;
  const gebW = saldW + restW;
  const gebaeude = berechnet(gebW, 'W', rest ? `Gebäude-Heizlast = saldiert ${fmt(saldW, 0)} W + Rest ${fmt(restW, 0)} W = ${fmt(gebW, 0)} W` : `Gebäude-Heizlast (saldiert) = ${fmt(gebW, 0)} W`, [saldiertRaeume, rest?.phiHL], { quelle: Q_METHODE });
  const summeMitRest = berechnet(summeW + restW, 'W', `Σ Räume + Rest = ${fmt(summeW, 0)} + ${fmt(restW, 0)} = ${fmt(summeW + restW, 0)} W`, [summeRaeume, rest?.phiHL], { quelle: Q_METHODE });
  const spezW = ebf.wert > 0 ? gebW / ebf.wert : 0;
  const spezifisch = berechnet(spezW, 'W/m²', `${fmt(gebW, 0)} W / ${fmt(ebf.wert, 0)} m² EBF = ${fmt(spezW, 1)} W/m²`, [gebaeude, ebf], { quelle: Q_METHODE });
  const anteil = saldW > 0 ? ((summeW - saldW) / saldW) * 100 : 0;
  const innentransmissionAnteil = berechnet(anteil, '%', `Σ Räume liegt ${fmt(anteil, 0)} % über der saldierten Gebäude-Heizlast (Innentransmission zu kälteren Räumen)`, [], { quelle: Q_METHODE });
  if (anteil > sia.plausibilitaet.innentransmissionAnteilMax * 100) hinweise.push({ stufe: 'info', code: 'gebaeude.innentransmissionHoch', text: `Σ Räume liegt ${fmt(anteil, 0)} % über der saldierten Gebäude-Heizlast — viele Bauteile zu kälteren Nachbarräumen; für den Wärmeerzeuger gilt der saldierte Wert.` });
  if (!beheizt.length && !rest) hinweise.push({ stufe: 'fehler', code: 'gebaeude.keineRaeume', text: 'Keine beheizten Räume erfasst — raumweise Heizlast nicht berechenbar.', pfad: 'raeume' });

  // Beispiel U_equiv für Bericht/Dashboard (Bodenplatte des ersten Erdreich-Bauteils)
  const ersteErd = raeume.flatMap((r) => r.bauteile).find((b) => b.anschluss === 'erdreich' && b.u.herkunft === 'berechnet');
  const uEquivBeispiel = ersteErd ? ersteErd.u : null;
  const erdFaktor = raeume.flatMap((r) => r.bauteile).find((b) => b.anschluss === 'erdreich')?.faktor ?? null;

  annahmen.push(...sammleAnnahmen([e.thetaE, deltaUWb, geschosshoehe, bStrich, brauchtErdreich ? thetaMittel : null, ebf]));
  for (const r of raeume) annahmen.push(...sammleAnnahmen([r.thetaInt, r.nMin, r.hoehe.herkunft === 'fallback' ? null : null, ...r.bauteile.map((b) => b.faktor)]));
  if (rest) annahmen.push(...sammleAnnahmen([rest.flaeche, ...rest.bauteile.map((b) => b.faktor)]));
  // Hüllen-Annahmen (U-Werte) kommen aus huelle.annahmen (dort gesammelt) — hier nicht doppelt.
  const fehler = hinweise.some((h) => h.stufe === 'fehler') || e.huelle.hinweise.some((h) => h.stufe === 'fehler');

  return {
    methode: `${sia.methode.bezeichnungBericht}; ΔU_WB ${fmt(deltaUWb.wert, 2)} W/(m²·K) pauschal; Lüftung n_min Tabelle NA.7 (${konzeptKurz(konzept, sia)}, ${dichtheit === 'altbau' ? 'Bestand ohne Luftdichtheitsnachweis' : 'Neubau-Dichtheit'}); kein Infiltrations-/Wiederaufheizterm`,
    thetaE: e.thetaE,
    deltaUWb,
    nMinDichtheit: dichtheit,
    lueftungskonzept: konzept,
    raeume,
    summeRaeume,
    saldiertRaeume,
    rest,
    gebaeude,
    summeMitRest,
    ebf,
    spezifisch,
    innentransmissionAnteil,
    erdreich: { bStrich, faktor: erdFaktor, uEquivBeispiel },
    annahmen,
    hinweise,
    vollstaendig: !fehler,
  };
}
