/**
 * Gebäudehülle: Bauteiltypen auf Gebäudeebene mit Stufen-Picker und EINER Schichtkette (KONTEXT §2 «Fallback-Kaskade
 * Hülle»; Befunde FACH-20/21/28/29, DATA-01/02, CODE-17) — reine Funktionen mit Herkunftsmodell.
 *
 *   Epochen-Default BESTAND (data/huelle-epochen.json, kein Sanierungs-Default)
 *   → jede bekannte Stufe (Bauweise, Dicke, Dämmung ja/nein, Dämmstoff, Dämmdicke; Fenster: Generation, Rahmen;
 *     Tür: Typ) ersetzt genau ihre Schicht bzw. ihren Tabellenwert
 *   → U = 1 / (Rsi + Σ d/λ (+ R Luftschicht) + Rse)   (ISO 6946 Reihenschaltung, Rsi nach Richtung, Rse nach Grenze)
 *   → Plausi-Clamp in die Epochen-Spanne, solange die Dämm-Stufe geschätzt ist (Hinweis)
 *   → Sanierung «ab Jahr X» je Bauteiltyp: Stufen der Sanierung ersetzen ihre Schicht; ohne Angabe gilt der
 *     Dämm-Default der Sanierungs-Epoche; Spanne der Sanierungs-Epoche für den Clamp
 *   → manueller U-Override gewinnt (Herkunft «override», Hinweis bei Abweichung)
 *   → Ergebnis `Wert` mit Herkunft, Stufe, Unsicherheit (±% aus Spanne) und Klartext-Begründung.
 *
 * Bodenplatte gegen Erdreich: U ohne Erdreich-Korrektur (Rse 0); U_equiv rechnet `raumweise.ts`.
 * Innenbauteile (Innenwand/-decke/-tür) für Raum-Raum-Transmission: Rsi beidseitig.
 * Einheiten: m, W/(m·K), m²K/W, W/(m²K).
 */
import type { Bauweise, EpochenDefault, HuelleDaten, SchichtDaten } from '../daten/huelle';
import type { Hinweis, Wert } from './wert';
import { fallback, fmt, override, sammleAnnahmen, schaetzung, tabelle } from './wert';

export type HuellBauteilArt = 'aussenwand' | 'dachSteil' | 'dachFlach' | 'deckeEstrich' | 'bodenKeller' | 'bodenErdreich';
export type InnenBauteilArt = 'innenwand' | 'innendecke' | 'innentuer';
export type BauteilArt = HuellBauteilArt | 'fenster' | 'tuer' | InnenBauteilArt;

export const HUELL_ARTEN: ReadonlyArray<HuellBauteilArt> = ['aussenwand', 'dachSteil', 'dachFlach', 'deckeEstrich', 'bodenKeller', 'bodenErdreich'];
export const INNEN_ARTEN: ReadonlyArray<InnenBauteilArt> = ['innenwand', 'innendecke', 'innentuer'];

type Richtung = 'horizontal' | 'aufwaerts' | 'abwaerts';
type Grenze = 'aussen' | 'erdreich' | 'hinterlueftet' | 'unbeheizt';

/** Stufen-Picker. Alles optional: unbekannte Stufen bleiben beim Epochen-Default (als Standardwert markiert). */
export interface Stufen {
  /** Bauweise (Key aus huelle-epochen.json bauweisen[art] bzw. innenbauteile[art].bauweisen). */
  bauweise?: string;
  /** Dicke der Tragschicht [m]; bei Zweischalenmauerwerk Gesamtdicke des Mauerwerks (ohne Putz). */
  dickeM?: number;
  /** Gedämmt ja/nein. */
  daemmung?: boolean;
  /** Dämmstoff (Key aus daemmstoffe). */
  daemmstoff?: string;
  /** Dämmdicke [m]. */
  daemmdickeM?: number;
  /** Fenster: Verglasungsgeneration (Key aus fenster.generationen). */
  generation?: string;
  /** Fenster: Rahmen (Key aus fenster.rahmen). */
  rahmen?: string;
  /** Tür: Typ (Key aus tueren.typen). */
  typ?: string;
}

export interface SanierungBauteiltyp {
  status: 'ausgefuehrt' | 'geplant';
  /** Jahr der Sanierung; bestimmt den Dämm-Default (Epoche) und die Clamp-Spanne. */
  jahr?: number;
  /** Was bei der Sanierung geändert wurde; ohne Angabe: Dämm-/Fenster-/Tür-Default der Sanierungs-Epoche. */
  stufen?: Stufen;
  /** U nach Sanierung manuell (z. B. aus Nachweis). */
  uOverride?: number;
  bezeichnung?: string;
}

export interface Bauteiltyp {
  id: string;
  art: BauteilArt;
  bezeichnung?: string;
  stufen?: Stufen;
  sanierung?: SanierungBauteiltyp;
  /** Manueller U-Wert [W/m²K] für den Ist-Zustand (gewinnt über alles). */
  uOverride?: number;
}

export interface HuelleEingabe {
  baujahr: number;
  bauteiltypen: Bauteiltyp[];
  /** Bezugsjahr für Sanierungen ohne Jahr (Default: letzte Epoche). */
  bezugsjahr?: number;
  /** 'ist' (Default): nur ausgeführte Sanierungen wirken; 'geplant': auch geplante. */
  zustand?: 'ist' | 'geplant';
}

export interface Schicht {
  rolle: string;
  label: string;
  dickeM: number;
  /** λ [W/(m·K)], null für Luftschicht/Pauschal. */
  lambda: number | null;
  /** Wärmedurchlasswiderstand der Schicht [m²K/W]. */
  rWert: number;
  material?: string;
  daemmstoff?: string;
  /** true, wenn die Schicht aus einer bekannten Stufe stammt (sonst Standardwert der Epoche/Vorlage). */
  bekannt: boolean;
}

export interface BauteilU {
  typId: string;
  art: BauteilArt;
  bezeichnung: string;
  /** Massgebender U-Wert (Zustand gemäss `zustand`). */
  u: Wert;
  /** U vor Sanierung (nur wenn eine Sanierung wirkt). */
  uUnsaniert: Wert | null;
  /** U nach geplanter Sanierung (nur bei zustand 'ist' und geplanter Sanierung). */
  uNachSanierung: Wert | null;
  epoche: string;
  epocheLabel: string;
  schichten: Schicht[];
  stufenBekannt: string[];
  stufenStandard: string[];
  spanne: [number, number] | null;
  geclampt: boolean;
  sanierungWirkt: boolean;
  hinweise: Hinweis[];
}

export interface HuelleErgebnis {
  baujahr: number;
  epoche: string;
  epocheLabel: string;
  bauteile: Record<string, BauteilU>;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
}

const Q_EPOCHE = 'huelle-epochen.json (GEAK, BFE Bauteilekatalog 2002, BFE-UFELD, eREN, SIA 380/1)';
const Q_FENSTER = 'EnFK Merkblatt Fenster 2021 / Bauteilekatalog (huelle-epochen.json fenster)';
const Q_TUER = 'BFE Bauteilekatalog 2002 / SIA 380/1 (huelle-epochen.json tueren)';
const Q_INNEN = 'Schichtrechnung ISO 6946 mit Bauteilekatalog-λ (huelle-epochen.json innenbauteile, Aufbau = Annahme)';

/* ---------------------------------------------------------------------------------------------- */
/* Epochen, Übergangswiderstände, Primitive                                                       */
/* ---------------------------------------------------------------------------------------------- */

/** Epochen-Key für ein Baujahr (vor1919 … ab2011); ungültiges Baujahr → letzte Epoche mit Hinweis durch den Aufrufer. */
export function epocheFuerBaujahr(baujahr: number, daten: HuelleDaten): string {
  const y = Number(baujahr);
  for (const e of daten.epochen) {
    if ((e.von === null || y >= e.von) && (e.bis === null || y <= e.bis)) return e.key;
  }
  return daten.epochen[daten.epochen.length - 1]!.key;
}

export function epocheLabel(key: string, daten: HuelleDaten): string {
  return daten.epochen.find((e) => e.key === key)?.label ?? key;
}

function epochenIndex(key: string, daten: HuelleDaten): number {
  return daten.epochen.findIndex((e) => e.key === key);
}

function richtungVon(s: string): Richtung {
  return s === 'aufwaerts' || s === 'abwaerts' ? s : 'horizontal';
}

function grenzeVon(s: string): Grenze {
  return s === 'erdreich' || s === 'hinterlueftet' || s === 'unbeheizt' ? s : 'aussen';
}

/** Rsi nach Wärmestromrichtung (ISO 6946 / SIA 180). */
export function rsiFuer(richtung: Richtung, daten: HuelleDaten): number {
  return daten._meta.konventionen.rsi[richtung] ?? daten._meta.konventionen.rsi.horizontal!;
}

/** Rse nach Grenze: aussen 0.04, Erdreich 0, hinterlüftet/unbeheizt = Rsi (Bauteilekatalog S. 17). */
export function rseFuer(grenze: Grenze, richtung: Richtung, daten: HuelleDaten): number {
  if (grenze === 'aussen') return daten._meta.konventionen.rseAussen;
  if (grenze === 'erdreich') return daten._meta.konventionen.rseErdreich;
  return rsiFuer(richtung, daten);
}

/** ISO 6946 Reihenschaltung: U = 1/(Rsi + Σ R_i + Rse). Primitive (ersetzt alt-calc uFromLayers). */
export function uAusWiderstaenden(rSchichten: ReadonlyArray<number>, rsi: number, rse: number): number {
  const r = rsi + rse + rSchichten.reduce((s, x) => s + (Number.isFinite(x) && x > 0 ? x : 0), 0);
  return r > 0 ? 1 / r : 0;
}

/** Wärmedurchlasswiderstand einer Datenschicht [m²K/W]. */
function rSchicht(s: SchichtDaten, richtung: Richtung, daten: HuelleDaten): { r: number; lambda: number | null } {
  if (s.daemmstoff) {
    const d = daten.daemmstoffe[s.daemmstoff] ?? daten.daemmstoffe.unbekannt!;
    return { r: s.dickeM / d.lambda, lambda: d.lambda };
  }
  const m = daten.materialien[s.material ?? ''];
  if (!m) return { r: 0, lambda: null };
  if (m.lambda === null) {
    const r = richtung === 'horizontal' ? m.rHorizontal : richtung === 'aufwaerts' ? m.rAufwaerts : m.rAbwaerts;
    return { r: r ?? 0, lambda: null };
  }
  return { r: s.dickeM / m.lambda, lambda: m.lambda };
}

function schichtAus(s: SchichtDaten, richtung: Richtung, daten: HuelleDaten, bekannt: boolean): Schicht {
  const { r, lambda } = rSchicht(s, richtung, daten);
  const out: Schicht = { rolle: s.rolle, label: s.label, dickeM: s.dickeM, lambda, rWert: r, bekannt };
  if (s.material) out.material = s.material;
  if (s.daemmstoff) out.daemmstoff = s.daemmstoff;
  return out;
}

/** Kurzname eines Materials/Dämmstoffs für Begründungstexte («Vollbackstein / Kaminstein (1800 kg/m³)» → «Vollbackstein»). */
function kurzName(label: string): string {
  return label.split(/ \(| \/ /)[0]!.trim();
}

function schichtLabel(s: Schicht, daten: HuelleDaten): string {
  if (s.rolle === 'pauschal') return s.label;
  if (s.material === 'luftschicht_ruhend') return `Luftschicht ${fmt(s.dickeM * 100, 1)} cm`;
  const name = s.daemmstoff ? (daten.daemmstoffe[s.daemmstoff]?.label ?? s.daemmstoff) : s.material ? (daten.materialien[s.material]?.label ?? s.material) : s.label;
  return `${kurzName(name)} ${fmt(s.dickeM * 100, 1)} cm`;
}

/* ---------------------------------------------------------------------------------------------- */
/* Opake Hüllbauteile: Schichtkette                                                                */
/* ---------------------------------------------------------------------------------------------- */

interface Kette {
  schichten: Schicht[];
  bauweise: string;
  bauweiseLabel: string;
  /** Epoche, deren Default/Spanne die Kette kalibriert. */
  epoche: string;
  pauschal: boolean;
}

function ketteAusDefault(art: HuellBauteilArt, epoche: string, def: EpochenDefault, richtung: Richtung, daten: HuelleDaten, bekannt = false): Kette {
  const bw = daten.bauweisen[art]?.[def.bauweise];
  return { schichten: def.schichten.map((s) => schichtAus(s, richtung, daten, bekannt)), bauweise: def.bauweise, bauweiseLabel: bw?.label ?? def.bauweise, epoche, pauschal: false };
}

/** Nächstliegende Epoche (zum Gebäude-Baujahr), deren Default-Aufbau die Bauweise verwendet. */
function epocheMitBauweise(art: HuellBauteilArt, bauweise: string, epocheBau: string, daten: HuelleDaten): string | null {
  const bt = daten.bauteile[art]!;
  const idxBau = epochenIndex(epocheBau, daten);
  let best: string | null = null;
  let bestAbstand = Infinity;
  for (const e of daten.epochen) {
    if (bt.epochen[e.key]?.bauweise !== bauweise) continue;
    const abstand = Math.abs(epochenIndex(e.key, daten) - idxBau);
    if (abstand < bestAbstand) {
      best = e.key;
      bestAbstand = abstand;
    }
  }
  return best;
}

/** Schichtkette für eine gewählte Bauweise: Epochen-Default mit dieser Bauweise → Schichtvorlage → Pauschal-U. */
function ketteFuerBauweise(art: HuellBauteilArt, bauweise: string, bw: Bauweise, epocheBau: string, richtung: Richtung, rsi: number, rse: number, daten: HuelleDaten): Kette | null {
  const e = epocheMitBauweise(art, bauweise, epocheBau, daten);
  if (e) {
    const k = ketteAusDefault(art, e, daten.bauteile[art]!.epochen[e]!, richtung, daten);
    k.bauweise = bauweise;
    k.bauweiseLabel = bw.label;
    return k;
  }
  if (bw.schichten) {
    const epocheGedaemmt = daten.bauteile[art]!.epochen[epocheBau]!.schichten.some((s) => s.daemmstoff);
    const dd = daemmDefault(art, epocheBau, daten);
    // Vorlage mit Dämmung in einer Epoche ohne Dämm-Default: Dämmdicke der nächsten gedämmten Epoche (geringste typische Dicke).
    const schichten = bw.schichten.map((s) => (s.daemmstoff && !epocheGedaemmt ? { ...s, daemmstoff: dd.daemmstoff ?? s.daemmstoff, dickeM: Math.min(s.dickeM, dd.dickeM) } : s));
    return { schichten: schichten.map((s) => schichtAus(s, richtung, daten, false)), bauweise, bauweiseLabel: bw.label, epoche: epocheBau, pauschal: false };
  }
  if (bw.uPauschal) {
    const r = Math.max(0.01, 1 / bw.uPauschal - rsi - rse);
    return { schichten: [{ rolle: 'pauschal', label: `${bw.label} (Pauschal-U ${fmt(bw.uPauschal, 2)})`, dickeM: 0, lambda: null, rWert: r, bekannt: false }], bauweise, bauweiseLabel: bw.label, epoche: epocheBau, pauschal: true };
  }
  return null;
}

/** Dämmschicht-Default für eine Bauteilart: nächste gedämmte Epoche ab `epoche` (Bauteilekatalog: geringste Dämmdicke). */
function daemmDefault(art: HuellBauteilArt, epoche: string, daten: HuelleDaten): SchichtDaten {
  const bt = daten.bauteile[art]!;
  const idx = epochenIndex(epoche, daten);
  for (let i = Math.max(0, idx); i < daten.epochen.length; i++) {
    const d = bt.epochen[daten.epochen[i]!.key]?.schichten.find((s) => s.daemmstoff);
    if (d) return d;
  }
  return { daemmstoff: 'unbekannt', dickeM: 0.04, rolle: 'daemmung', label: 'Dämmung 4 cm (unbekannt)' };
}

function setzeDaemmung(kette: Kette, stufen: Stufen, art: HuellBauteilArt, epoche: string, richtung: Richtung, daten: HuelleDaten, hinweise: Hinweis[], pfad: string, bekanntStufen: string[]): void {
  const idxD = kette.schichten.findIndex((s) => s.rolle === 'daemmung');
  const will = stufen.daemmung === true || (stufen.daemmung === undefined && (stufen.daemmstoff !== undefined || stufen.daemmdickeM !== undefined));

  if (stufen.daemmung === false) {
    bekanntStufen.push('daemmung');
    if (idxD >= 0) {
      const alt = kette.schichten[idxD]!;
      const zweischalig = kette.schichten.some((s) => s.rolle === 'aussenschale');
      const sparren = kette.schichten.some((s) => s.rolle === 'sparrenfeld');
      if (zweischalig) {
        const luft = schichtAus({ material: 'luftschicht_ruhend', dickeM: alt.dickeM, rolle: 'luftschicht', label: `Luftschicht ${fmt(alt.dickeM * 100, 0)} cm` }, richtung, daten, true);
        kette.schichten.splice(idxD, 1, luft);
      } else if (sparren) {
        kette.schichten.splice(idxD, 1);
        const sf = kette.schichten.find((s) => s.rolle === 'sparrenfeld');
        if (sf) {
          sf.dickeM += alt.dickeM;
          sf.bekannt = true;
        }
      } else {
        kette.schichten.splice(idxD, 1);
      }
    }
    if (stufen.daemmstoff !== undefined || stufen.daemmdickeM !== undefined) {
      hinweise.push({ stufe: 'info', code: 'huelle.daemmungNein', text: 'Dämmstoff/Dämmdicke werden ignoriert, weil «ungedämmt» gewählt ist.', pfad: `${pfad}.stufen.daemmung` });
    }
    return;
  }

  if (!will) return;

  bekanntStufen.push('daemmung');
  let layer: Schicht;
  if (idxD >= 0) {
    layer = kette.schichten[idxD]!;
  } else {
    const def = daemmDefault(art, epoche, daten);
    layer = schichtAus(def, richtung, daten, false);
    const idxLuft = kette.schichten.findIndex((s) => s.rolle === 'luftschicht');
    const idxSparren = kette.schichten.findIndex((s) => s.rolle === 'sparrenfeld');
    if (idxLuft >= 0) {
      layer.dickeM = kette.schichten[idxLuft]!.dickeM;
      layer.label = `Kerndämmung ${fmt(layer.dickeM * 100, 0)} cm`;
      kette.schichten.splice(idxLuft, 1, layer);
    } else if (idxSparren >= 0) {
      const sf = kette.schichten[idxSparren]!;
      layer.dickeM = Math.min(layer.dickeM, Math.max(0.04, sf.dickeM));
      sf.dickeM = Math.max(0, sf.dickeM - layer.dickeM);
      kette.schichten.splice(idxSparren, 0, layer);
    } else {
      const idxT = kette.schichten.findIndex((s) => s.rolle === 'tragschicht' || s.rolle === 'pauschal');
      kette.schichten.splice(idxT >= 0 ? idxT + 1 : kette.schichten.length, 0, layer);
    }
  }
  if (stufen.daemmstoff !== undefined) {
    if (daten.daemmstoffe[stufen.daemmstoff]) {
      layer.daemmstoff = stufen.daemmstoff;
      bekanntStufen.push('daemmstoff');
    } else {
      hinweise.push({ stufe: 'warnung', code: 'huelle.daemmstoffUnbekannt', text: `Dämmstoff «${stufen.daemmstoff}» unbekannt — Standard-Dämmstoff verwendet.`, pfad: `${pfad}.stufen.daemmstoff` });
    }
  }
  if (stufen.daemmdickeM !== undefined && Number.isFinite(stufen.daemmdickeM) && stufen.daemmdickeM > 0) {
    const sf = kette.schichten.find((s) => s.rolle === 'sparrenfeld');
    if (sf) sf.dickeM = Math.max(0, sf.dickeM + layer.dickeM - stufen.daemmdickeM);
    layer.dickeM = stufen.daemmdickeM;
    bekanntStufen.push('daemmdicke');
  }
  layer.bekannt = bekanntStufen.includes('daemmstoff') && bekanntStufen.includes('daemmdicke');
  const lam = daten.daemmstoffe[layer.daemmstoff ?? 'unbekannt']!.lambda;
  layer.lambda = lam;
  layer.rWert = layer.dickeM / lam;
  layer.label = `${kurzName(daten.daemmstoffe[layer.daemmstoff ?? 'unbekannt']!.label)} ${fmt(layer.dickeM * 100, 1)} cm`;
}

function setzeDicke(kette: Kette, dickeM: number, hinweise: Hinweis[], pfad: string, bekanntStufen: string[]): void {
  if (!Number.isFinite(dickeM) || dickeM <= 0) return;
  if (kette.pauschal) {
    hinweise.push({ stufe: 'info', code: 'huelle.dickeOhneWirkung', text: `Dicke ohne Wirkung: ${kette.bauweiseLabel} wird mit Pauschal-U gerechnet.`, pfad: `${pfad}.stufen.dickeM` });
    return;
  }
  const trag = kette.schichten.find((s) => s.rolle === 'tragschicht');
  if (trag) {
    bekanntStufen.push('dicke');
    const aussenschale = kette.schichten.find((s) => s.rolle === 'aussenschale');
    if (aussenschale) {
      const zwischen = kette.schichten.find((s) => s.rolle === 'luftschicht' || s.rolle === 'daemmung');
      const innen = dickeM - aussenschale.dickeM - (zwischen?.dickeM ?? 0);
      if (innen < 0.06) hinweise.push({ stufe: 'warnung', code: 'huelle.dickeZweischalig', text: `Gesamtdicke ${fmt(dickeM * 100, 0)} cm ist für Zweischalenmauerwerk zu klein (Aussenschale ${fmt(aussenschale.dickeM * 100, 0)} cm + Zwischenraum); Innenschale auf 6 cm gesetzt.`, pfad: `${pfad}.stufen.dickeM` });
      trag.dickeM = Math.max(0.06, innen);
    } else {
      trag.dickeM = dickeM;
    }
    trag.bekannt = true;
    if (trag.lambda) trag.rWert = trag.dickeM / trag.lambda;
    return;
  }
  const sparren = kette.schichten.find((s) => s.rolle === 'sparrenfeld');
  if (sparren) {
    bekanntStufen.push('dicke');
    const daemm = kette.schichten.find((s) => s.rolle === 'daemmung');
    sparren.dickeM = Math.max(0, dickeM - (daemm?.dickeM ?? 0));
    sparren.bekannt = true;
    return;
  }
  hinweise.push({ stufe: 'info', code: 'huelle.dickeOhneWirkung', text: 'Dicke ohne Wirkung bei dieser Bauweise (keine Tragschicht in der Schichtkette).', pfad: `${pfad}.stufen.dickeM` });
}

interface OpakResultat {
  u: number;
  kette: Kette;
  bekannt: string[];
  standard: string[];
  spanne: [number, number];
  spanneEpoche: string;
  geclampt: boolean;
  uRoh: number;
  rsi: number;
  rse: number;
}

/** Schichtkette aufbauen und U berechnen (ohne Wert-Verpackung). */
function opakAufloesen(art: HuellBauteilArt, epocheBau: string, stufen: Stufen, sanierung: { stufen: Stufen; epoche: string } | null, daten: HuelleDaten, hinweise: Hinweis[], pfad: string): OpakResultat {
  const bt = daten.bauteile[art]!;
  const richtung = richtungVon(bt.richtung);
  const rsi = rsiFuer(richtung, daten);
  const rse = rseFuer(grenzeVon(bt.grenze), richtung, daten);
  const def = bt.epochen[epocheBau]!;
  const bekannt: string[] = [];

  // 1. Bauweise
  let kette: Kette;
  if (stufen.bauweise !== undefined && stufen.bauweise !== def.bauweise) {
    const bw = daten.bauweisen[art]?.[stufen.bauweise];
    const k = bw ? ketteFuerBauweise(art, stufen.bauweise, bw, epocheBau, richtung, rsi, rse, daten) : null;
    if (k) {
      kette = k;
      bekannt.push('bauweise');
    } else {
      kette = ketteAusDefault(art, epocheBau, def, richtung, daten);
      hinweise.push({ stufe: 'warnung', code: 'huelle.bauweiseUnbekannt', text: `Bauweise «${stufen.bauweise}» ist für ${bt.label} nicht hinterlegt — Epochen-Default verwendet.`, pfad: `${pfad}.stufen.bauweise` });
    }
  } else {
    kette = ketteAusDefault(art, epocheBau, def, richtung, daten);
    if (stufen.bauweise !== undefined) bekannt.push('bauweise');
  }

  // 2. Dicke, 3.–5. Dämmung
  if (stufen.dickeM !== undefined) setzeDicke(kette, stufen.dickeM, hinweise, pfad, bekannt);
  setzeDaemmung(kette, stufen, art, epocheBau, richtung, daten, hinweise, pfad, bekannt);

  // Sanierung: Stufen der Sanierung ersetzen ihre Schicht (Dämmung); ohne Angabe Dämm-Default der Sanierungs-Epoche.
  // Clamp-Spanne: Epoche des Gebäudes (bzw. der Sanierung) — nicht die Epoche, aus der eine Bauweisen-Vorlage stammt.
  let spanneEpoche = epocheBau;
  if (sanierung) {
    const s = { ...sanierung.stufen };
    if (s.daemmung === undefined && s.daemmstoff === undefined && s.daemmdickeM === undefined) {
      const d = daemmDefault(art, sanierung.epoche, daten);
      s.daemmung = true;
      // Default der Sanierungs-Epoche als Standardwert (nicht «bekannt»)
      const vorher = bekannt.length;
      const idxD = kette.schichten.findIndex((x) => x.rolle === 'daemmung');
      if (idxD >= 0) kette.schichten.splice(idxD, 1);
      setzeDaemmung(kette, { daemmung: true }, art, sanierung.epoche, richtung, daten, hinweise, pfad, bekannt);
      const layer = kette.schichten.find((x) => x.rolle === 'daemmung');
      if (layer) {
        layer.daemmstoff = d.daemmstoff ?? 'unbekannt';
        layer.dickeM = d.dickeM;
        const lam = daten.daemmstoffe[layer.daemmstoff]!.lambda;
        layer.lambda = lam;
        layer.rWert = d.dickeM / lam;
        layer.label = `${kurzName(daten.daemmstoffe[layer.daemmstoff]!.label)} ${fmt(d.dickeM * 100, 1)} cm (Standard Sanierung ${epocheLabel(sanierung.epoche, daten)})`;
        layer.bekannt = false;
      }
      bekannt.splice(vorher);
      bekannt.push('sanierung');
    } else {
      if (s.daemmung === undefined) s.daemmung = true;
      if (s.bauweise !== undefined) {
        const bw = daten.bauweisen[art]?.[s.bauweise];
        const k = bw ? ketteFuerBauweise(art, s.bauweise, bw, sanierung.epoche, richtung, rsi, rse, daten) : null;
        if (k) kette = k;
      }
      if (s.dickeM !== undefined) setzeDicke(kette, s.dickeM, hinweise, pfad, bekannt);
      const idxD = kette.schichten.findIndex((x) => x.rolle === 'daemmung');
      if (s.daemmung === true && idxD >= 0 && (s.daemmstoff !== undefined || s.daemmdickeM !== undefined)) {
        // neue Dämmung ersetzt die alte vollständig
        kette.schichten.splice(idxD, 1);
      }
      setzeDaemmung(kette, s, art, sanierung.epoche, richtung, daten, hinweise, pfad, bekannt);
      bekannt.push('sanierung');
    }
    spanneEpoche = sanierung.epoche;
  }

  const uRoh = uAusWiderstaenden(kette.schichten.map((s) => s.rWert), rsi, rse);
  const spanneDef = bt.epochen[spanneEpoche]!.uSpanne;
  const spanne: [number, number] = [spanneDef.min, spanneDef.max];

  // Clamp nur, solange die Dämm-Stufe (ja/nein) geschätzt ist — sie dominiert die Epochen-Spanne; eine bekannte Dämm-Angabe gewinnt.
  const daemmBekannt = bekannt.includes('daemmung');
  let u = uRoh;
  let geclampt = false;
  if (!daemmBekannt && !kette.pauschal) {
    if (uRoh < spanne[0]) {
      u = spanne[0];
      geclampt = true;
    } else if (uRoh > spanne[1]) {
      u = spanne[1];
      geclampt = true;
    }
    if (geclampt) hinweise.push({ stufe: 'info', code: 'huelle.clamp', text: `Schichtrechnung ergibt U ${fmt(uRoh, 2)} W/m²K — ausserhalb der Epochen-Spanne ${fmt(spanne[0], 2)}–${fmt(spanne[1], 2)} (${epocheLabel(spanneEpoche, daten)}); auf ${fmt(u, 2)} begrenzt. Dämmung angeben, um den Rechenwert zu übernehmen.`, pfad: `${pfad}.stufen` });
  } else if (uRoh < spanne[0] || uRoh > spanne[1]) {
    hinweise.push({ stufe: 'info', code: 'huelle.ausserhalbSpanne', text: `U ${fmt(uRoh, 2)} W/m²K liegt ausserhalb der typischen Spanne ${fmt(spanne[0], 2)}–${fmt(spanne[1], 2)} der Epoche ${epocheLabel(spanneEpoche, daten)} — Eingaben prüfen (Wert wird übernommen).`, pfad: `${pfad}.stufen` });
  }
  const alle = ['bauweise', 'dicke', 'daemmung', 'daemmstoff', 'daemmdicke'];
  const hatDaemmung = kette.schichten.some((s) => s.rolle === 'daemmung');
  const relevant = alle.filter((k) => hatDaemmung || (k !== 'daemmstoff' && k !== 'daemmdicke'));
  const standard = relevant.filter((k) => !bekannt.includes(k));
  return { u, kette, bekannt, standard, spanne, spanneEpoche, geclampt, uRoh, rsi, rse };
}

/**
 * Unsicherheit [±%] nach Kenntnisstand (Thermowerk-Annahme): alle Stufen geschätzt → Epochenwert (halbe Spanne / U);
 * Dämmung ja/nein bekannt, Dicke geschätzt → ±30 %; Dämmdicke bekannt → ±20 %; alle Stufen bekannt → ±10 %.
 */
function unsicherheitOpak(r: OpakResultat, def: EpochenDefault): number {
  if (r.standard.length === 0) return 10;
  const hatDaemm = r.kette.schichten.some((s) => s.rolle === 'daemmung');
  if (r.bekannt.includes('daemmung') && (!hatDaemm || r.bekannt.includes('daemmdicke'))) return 20;
  if (r.bekannt.includes('daemmung')) return 30;
  if (r.bekannt.length === 0) return Math.min(100, def.unsicherheitProzent);
  const halb = (r.spanne[1] - r.spanne[0]) / 2;
  return Math.min(100, Math.max(15, Math.round((halb / r.u) * 100)));
}

function stufenText(k: string): string {
  return ({ bauweise: 'Bauweise', dicke: 'Dicke', daemmung: 'Dämmung ja/nein', daemmstoff: 'Dämmstoff', daemmdicke: 'Dämmdicke', sanierung: 'Sanierung', generation: 'Verglasung', rahmen: 'Rahmen', typ: 'Türtyp' } as Record<string, string>)[k] ?? k;
}

function wertOpak(art: HuellBauteilArt, baujahr: number, epocheBau: string, r: OpakResultat, daten: HuelleDaten, san: { status: string; jahr?: number | undefined } | null): Wert {
  const bt = daten.bauteile[art]!;
  const def = bt.epochen[epocheBau]!;
  const schichtenText = r.kette.schichten.map((s) => `${schichtLabel(s, daten)}${s.bekannt ? '' : ' (Standard)'}`).join(', ');
  const hatDaemm = r.kette.schichten.some((s) => s.rolle === 'daemmung');
  const bekanntText = r.bekannt.length ? `bekannt: ${r.bekannt.map(stufenText).join(', ')}` : 'alle Stufen geschätzt';
  const sanText = san ? `; Sanierung ${san.status === 'geplant' ? 'geplant' : 'ausgeführt'}${san.jahr ? ` ${san.jahr}` : ''}` : '';
  const unsicherheit = unsicherheitOpak(r, def);
  const band: [number, number] = [Math.max(0.05, r.u * (1 - unsicherheit / 100)), r.u * (1 + unsicherheit / 100)];
  const basis = `${bt.label}: ${r.kette.bauweiseLabel}${hatDaemm || /ungedämmt/i.test(r.kette.bauweiseLabel) ? '' : ', ungedämmt'} — ${schichtenText} → U ${fmt(r.uRoh, 2)} W/m²K${r.geclampt ? ` (auf Spanne ${fmt(r.spanne[0], 2)}–${fmt(r.spanne[1], 2)} begrenzt: ${fmt(r.u, 2)})` : ''}; ${bekanntText}${sanText}, ±${unsicherheit} %`;
  const opt = { stufe: r.standard.length === 0 ? 'stufen_vollstaendig' : r.bekannt.length === 0 ? 'epoche' : `stufen_${r.bekannt.join('+')}`, unsicherheit, band, quelle: Q_EPOCHE };
  if (r.bekannt.length === 0) return fallback(r.u, 'W/m²K', `geschätzt aus Baujahr ${baujahr} (${epocheLabel(epocheBau, daten)}): ${basis}`, opt);
  if (r.standard.length === 0) return schaetzung(r.u, 'W/m²K', `berechnet aus Schichtaufbau (alle Stufen bekannt; Nebenschichten Standard Baujahr ${baujahr}): ${basis}`, opt);
  return schaetzung(r.u, 'W/m²K', `geschätzt aus Baujahr ${baujahr} und Angaben: ${basis}`, opt);
}

/* ---------------------------------------------------------------------------------------------- */
/* Fenster, Türen, Innenbauteile                                                                   */
/* ---------------------------------------------------------------------------------------------- */

function fensterU(epocheKey: string, stufen: Stufen, daten: HuelleDaten, hinweise: Hinweis[], pfad: string): { u: Wert; bekannt: string[]; standard: string[]; spanne: [number, number] } {
  const f = daten.fenster;
  const ep = f.epochen[epocheKey]!;
  const bekannt: string[] = [];
  let genKey = ep.generation;
  let rahmenKey = ep.rahmen;
  if (stufen.generation !== undefined) {
    if (f.generationen.some((g) => g.key === stufen.generation)) {
      genKey = stufen.generation;
      bekannt.push('generation');
    } else hinweise.push({ stufe: 'warnung', code: 'huelle.generationUnbekannt', text: `Fenstergeneration «${stufen.generation}» unbekannt — Epochen-Default verwendet.`, pfad: `${pfad}.stufen.generation` });
  }
  if (stufen.rahmen !== undefined) {
    if (f.rahmen[stufen.rahmen]) {
      rahmenKey = stufen.rahmen;
      bekannt.push('rahmen');
    } else hinweise.push({ stufe: 'warnung', code: 'huelle.rahmenUnbekannt', text: `Rahmen «${stufen.rahmen}» unbekannt — Standardrahmen verwendet.`, pfad: `${pfad}.stufen.rahmen` });
  }
  const gen = f.generationen.find((g) => g.key === genKey)!;
  const rahmen = f.rahmen[rahmenKey]!;
  const spanne: [number, number] = [ep.uSpanne.min, ep.uSpanne.max];
  const standard = ['generation', 'rahmen'].filter((k) => !bekannt.includes(k));
  if (bekannt.length === 0) {
    const u = fallback(ep.uwDefault, 'W/m²K', `geschätzt aus Epoche ${epocheLabel(epocheKey, daten)}: ${gen.label}, Rahmen ${rahmen.label} (Standard) → Uw ${fmt(ep.uwDefault, 2)} W/m²K (Spanne ${fmt(spanne[0], 1)}–${fmt(spanne[1], 1)}), ±${ep.unsicherheitProzent} %`, {
      stufe: 'epoche',
      unsicherheit: ep.unsicherheitProzent,
      band: spanne,
      quelle: Q_FENSTER,
    });
    return { u, bekannt, standard, spanne };
  }
  const uw = gen.uwJeUf[rahmen.spalte] ?? ep.uwDefault;
  const unsicherheit = bekannt.length === 2 ? 5 : 10;
  const u = tabelle(uw, 'W/m²K', `${gen.label} (${bekannt.includes('generation') ? 'bekannt' : 'Standard'}), Rahmen ${rahmen.label} Uf ${fmt(rahmen.uf, 1)} (${bekannt.includes('rahmen') ? 'bekannt' : 'Standard'}) → Uw ${fmt(uw, 2)} W/m²K, ±${unsicherheit} %`, Q_FENSTER, {
    stufe: `stufen_${bekannt.join('+')}`,
    unsicherheit,
    band: [uw * (1 - unsicherheit / 100), uw * (1 + unsicherheit / 100)],
  });
  return { u, bekannt, standard, spanne };
}

function tuerU(epocheKey: string, stufen: Stufen, daten: HuelleDaten, hinweise: Hinweis[], pfad: string): { u: Wert; bekannt: string[]; standard: string[]; spanne: [number, number] } {
  const t = daten.tueren;
  const ep = t.epochen[epocheKey]!;
  const spanne: [number, number] = [ep.spanne[0]!, ep.spanne[1]!];
  if (stufen.typ !== undefined) {
    const typ = t.typen.find((x) => x.key === stufen.typ);
    if (typ) {
      const u = tabelle(typ.u, 'W/m²K', `${typ.label} (bekannt) → U ${fmt(typ.u, 2)} W/m²K, ±10 %`, Q_TUER, { stufe: 'stufen_typ', unsicherheit: 10, band: [typ.u * 0.9, typ.u * 1.1] });
      return { u, bekannt: ['typ'], standard: [], spanne };
    }
    hinweise.push({ stufe: 'warnung', code: 'huelle.tuertypUnbekannt', text: `Türtyp «${stufen.typ}» unbekannt — Epochen-Default verwendet.`, pfad: `${pfad}.stufen.typ` });
  }
  const typ = t.typen.find((x) => x.key === ep.typ)!;
  const unsicherheit = Math.round(((spanne[1] - spanne[0]) / 2 / typ.u) * 100);
  const u = fallback(typ.u, 'W/m²K', `geschätzt aus Epoche ${epocheLabel(epocheKey, daten)}: ${typ.label} (Standard) → U ${fmt(typ.u, 2)} W/m²K (Spanne ${fmt(spanne[0], 1)}–${fmt(spanne[1], 1)}), ±${unsicherheit} %`, {
    stufe: 'epoche',
    unsicherheit,
    band: spanne,
    quelle: Q_TUER,
  });
  return { u, bekannt: [], standard: ['typ'], spanne };
}

function innenU(art: InnenBauteilArt, stufen: Stufen, daten: HuelleDaten, hinweise: Hinweis[], pfad: string): { u: Wert; schichten: Schicht[]; bekannt: string[]; standard: string[] } {
  const ib = daten.innenbauteile[art];
  const richtung = richtungVon(ib.richtung);
  const rsi = rsiFuer(richtung, daten);
  let key = ib.default;
  const bekannt: string[] = [];
  if (stufen.bauweise !== undefined) {
    if (ib.bauweisen[stufen.bauweise]) {
      key = stufen.bauweise;
      bekannt.push('bauweise');
    } else hinweise.push({ stufe: 'warnung', code: 'huelle.bauweiseUnbekannt', text: `Bauweise «${stufen.bauweise}» für ${art} nicht hinterlegt — Standard verwendet.`, pfad: `${pfad}.stufen.bauweise` });
  }
  const bw = ib.bauweisen[key]!;
  let u: number;
  let schichten: Schicht[] = [];
  if (bw.schichten) {
    schichten = bw.schichten.map((s) => schichtAus(s, richtung, daten, bekannt.length > 0));
    u = uAusWiderstaenden(schichten.map((s) => s.rWert), rsi, rsi);
  } else {
    u = bw.uPauschal ?? 2;
  }
  const unsicherheit = 15;
  const text = `${bw.label} (${bekannt.length ? 'bekannt' : 'Standard'}) → U ${fmt(u, 2)} W/m²K (Rsi beidseitig), ±${unsicherheit} %`;
  const opt = { stufe: bekannt.length ? 'stufen_bauweise' : 'innen_default', unsicherheit, band: [u * (1 - unsicherheit / 100), u * (1 + unsicherheit / 100)] as [number, number], quelle: Q_INNEN };
  const w = bekannt.length ? schaetzung(u, 'W/m²K', text, opt) : fallback(u, 'W/m²K', text, opt);
  return { u: w, schichten, bekannt, standard: bekannt.length ? [] : ['bauweise'] };
}

/* ---------------------------------------------------------------------------------------------- */
/* Bauteiltyp auflösen                                                                             */
/* ---------------------------------------------------------------------------------------------- */

function istHuellArt(art: BauteilArt): art is HuellBauteilArt {
  return (HUELL_ARTEN as ReadonlyArray<string>).includes(art);
}

function istInnenArt(art: BauteilArt): art is InnenBauteilArt {
  return (INNEN_ARTEN as ReadonlyArray<string>).includes(art);
}

/** Löst einen Bauteiltyp auf: Default → Stufen → Sanierung → Override. */
export function aufloesenBauteiltyp(typ: Bauteiltyp, e: Pick<HuelleEingabe, 'baujahr' | 'bezugsjahr' | 'zustand'>, daten: HuelleDaten): BauteilU {
  const hinweise: Hinweis[] = [];
  const pfad = `huelle.bauteiltypen.${typ.id}`;
  const baujahr = Number(e.baujahr);
  const epoche = epocheFuerBaujahr(baujahr, daten);
  const epLabel = epocheLabel(epoche, daten);
  const stufen = typ.stufen ?? {};
  const bezeichnung = typ.bezeichnung ?? bauteilArtLabel(typ.art, daten);
  const zustand = e.zustand ?? 'ist';
  const bezugsjahr = e.bezugsjahr ?? new Date().getUTCFullYear();

  const san = typ.sanierung;
  const sanWirkt = !!san && (san.status === 'ausgefuehrt' || zustand === 'geplant');
  const sanInfo = san ? { stufen: san.stufen ?? {}, epoche: epocheFuerBaujahr(san.jahr ?? bezugsjahr, daten) } : null;
  if (san && san.jahr === undefined) hinweise.push({ stufe: 'info', code: 'huelle.sanierungOhneJahr', text: `Sanierung «${bezeichnung}» ohne Jahr — Dämm-Standard der aktuellen Epoche angenommen (${epocheLabel(sanInfo!.epoche, daten)}).`, pfad: `${pfad}.sanierung.jahr` });

  let u: Wert;
  let uUnsaniert: Wert | null = null;
  let uNachSanierung: Wert | null = null;
  let schichten: Schicht[] = [];
  let stufenBekannt: string[] = [];
  let stufenStandard: string[] = [];
  let spanne: [number, number] | null = null;
  let geclampt = false;

  if (istHuellArt(typ.art)) {
    const basis = opakAufloesen(typ.art, epoche, stufen, null, daten, hinweise, pfad);
    const basisW = wertOpak(typ.art, baujahr, epoche, basis, daten, null);
    let r = basis;
    let w = basisW;
    if (sanInfo) {
      const nach = opakAufloesen(typ.art, epoche, stufen, sanInfo, daten, [], pfad);
      const nachW = san!.uOverride !== undefined ? override(san!.uOverride, 'W/m²K', `U nach Sanierung ${fmt(san!.uOverride, 2)} W/m²K manuell`) : wertOpak(typ.art, baujahr, epoche, nach, daten, { status: san!.status, jahr: san!.jahr });
      if (sanWirkt) {
        uUnsaniert = basisW;
        r = nach;
        w = nachW;
      } else {
        uNachSanierung = nachW;
      }
    }
    u = w;
    schichten = r.kette.schichten;
    stufenBekannt = r.bekannt;
    stufenStandard = r.standard;
    spanne = r.spanne;
    geclampt = r.geclampt;
  } else if (typ.art === 'fenster') {
    const basis = fensterU(epoche, stufen, daten, hinweise, pfad);
    let res = basis;
    if (sanInfo) {
      const sStufen: Stufen = {};
      if (sanInfo.stufen.generation !== undefined) sStufen.generation = sanInfo.stufen.generation;
      const rahmen = sanInfo.stufen.rahmen ?? stufen.rahmen;
      if (rahmen !== undefined) sStufen.rahmen = rahmen;
      const nach = fensterU(sanInfo.epoche, sStufen, daten, [], pfad);
      const nachW = san!.uOverride !== undefined ? override(san!.uOverride, 'W/m²K', `Uw nach Sanierung ${fmt(san!.uOverride, 2)} W/m²K manuell`) : { ...nach.u, begruendung: `Fenster ersetzt${san!.jahr ? ` ${san!.jahr}` : ''}: ${nach.u.begruendung}` };
      if (sanWirkt) {
        uUnsaniert = basis.u;
        res = { ...nach, u: nachW, bekannt: [...nach.bekannt, 'sanierung'], standard: nach.standard };
      } else uNachSanierung = nachW;
    }
    u = res.u;
    stufenBekannt = res.bekannt;
    stufenStandard = res.standard;
    spanne = res.spanne;
  } else if (typ.art === 'tuer') {
    const basis = tuerU(epoche, stufen, daten, hinweise, pfad);
    let res = basis;
    if (sanInfo) {
      const tStufen: Stufen = {};
      if (sanInfo.stufen.typ !== undefined) tStufen.typ = sanInfo.stufen.typ;
      const nach = tuerU(sanInfo.epoche, tStufen, daten, [], pfad);
      const nachW = san!.uOverride !== undefined ? override(san!.uOverride, 'W/m²K', `U nach Sanierung ${fmt(san!.uOverride, 2)} W/m²K manuell`) : { ...nach.u, begruendung: `Tür ersetzt${san!.jahr ? ` ${san!.jahr}` : ''}: ${nach.u.begruendung}` };
      if (sanWirkt) {
        uUnsaniert = basis.u;
        res = { ...nach, u: nachW, bekannt: [...nach.bekannt, 'sanierung'], standard: nach.standard };
      } else uNachSanierung = nachW;
    }
    u = res.u;
    stufenBekannt = res.bekannt;
    stufenStandard = res.standard;
    spanne = res.spanne;
  } else if (istInnenArt(typ.art)) {
    const r = innenU(typ.art, stufen, daten, hinweise, pfad);
    u = r.u;
    schichten = r.schichten;
    stufenBekannt = r.bekannt;
    stufenStandard = r.standard;
  } else {
    u = fallback(1, 'W/m²K', `Bauteilart «${String(typ.art)}» unbekannt — U 1.0 angenommen`, { stufe: 'unbekannt' });
    hinweise.push({ stufe: 'fehler', code: 'huelle.artUnbekannt', text: `Bauteilart «${String(typ.art)}» ist nicht definiert.`, pfad });
  }

  if (typ.uOverride !== undefined && Number.isFinite(typ.uOverride) && typ.uOverride > 0) {
    const alt = u.wert;
    u = override(typ.uOverride, 'W/m²K', `U ${fmt(typ.uOverride, 2)} W/m²K manuell (statt ${fmt(alt, 2)} geschätzt)`);
    if (alt > 0 && Math.abs(typ.uOverride - alt) / alt > 0.5) hinweise.push({ stufe: 'warnung', code: 'huelle.overrideAbweichung', text: `Manueller U-Wert ${fmt(typ.uOverride, 2)} weicht stark vom geschätzten ${fmt(alt, 2)} W/m²K ab.`, pfad: `${pfad}.uOverride` });
    stufenBekannt = ['override'];
    stufenStandard = [];
    geclampt = false;
  }
  const pl = daten.plausibilitaet;
  if (u.wert > pl.uMaxWarnung || u.wert < pl.uMinWarnung) hinweise.push({ stufe: 'warnung', code: 'huelle.uUnplausibel', text: `U ${fmt(u.wert, 2)} W/m²K für ${bezeichnung} ist unplausibel (erwartet ${fmt(pl.uMinWarnung, 2)}–${fmt(pl.uMaxWarnung, 1)}).`, pfad });

  return { typId: typ.id, art: typ.art, bezeichnung, u, uUnsaniert, uNachSanierung, epoche, epocheLabel: epLabel, schichten, stufenBekannt, stufenStandard, spanne, geclampt, sanierungWirkt: sanWirkt, hinweise };
}

/** Alle Bauteiltypen eines Gebäudes auflösen. */
export function huelleAufloesen(e: HuelleEingabe, daten: HuelleDaten): HuelleErgebnis {
  const hinweise: Hinweis[] = [];
  const baujahr = Number(e.baujahr);
  if (!Number.isFinite(baujahr) || baujahr < 1500 || baujahr > 2100) {
    hinweise.push({ stufe: 'fehler', code: 'huelle.baujahrFehlt', text: 'Baujahr fehlt oder ist unplausibel — ohne Baujahr keine Epochen-Defaults für die Hülle.', pfad: 'gebaeude.baujahr' });
  }
  const epoche = epocheFuerBaujahr(baujahr, daten);
  const bauteile: Record<string, BauteilU> = {};
  const ids = new Set<string>();
  for (const typ of e.bauteiltypen) {
    if (ids.has(typ.id)) {
      hinweise.push({ stufe: 'fehler', code: 'huelle.idDoppelt', text: `Bauteiltyp-ID «${typ.id}» ist doppelt.`, pfad: `huelle.bauteiltypen.${typ.id}` });
      continue;
    }
    ids.add(typ.id);
    const b = aufloesenBauteiltyp(typ, e, daten);
    bauteile[typ.id] = b;
    hinweise.push(...b.hinweise);
  }
  const annahmen = sammleAnnahmen(Object.values(bauteile).map((b) => b.u));
  return { baujahr, epoche, epocheLabel: epocheLabel(epoche, daten), bauteile, annahmen, hinweise };
}

/* ---------------------------------------------------------------------------------------------- */
/* Hilfen für UI und Orchestrierung                                                               */
/* ---------------------------------------------------------------------------------------------- */

export function bauteilArtLabel(art: BauteilArt, daten: HuelleDaten): string {
  if (art === 'fenster') return 'Fenster';
  if (art === 'tuer') return 'Aussentür';
  if (art === 'innenwand') return 'Innenwand';
  if (art === 'innendecke') return 'Innendecke / Zwischenboden';
  if (art === 'innentuer') return 'Innentür';
  return daten.bauteile[art]?.label ?? art;
}

export interface StandardTypenOptionen {
  dachform?: 'steil' | 'flach';
  /** Dachraum beheizt (Dach = Hülle) oder unbeheizter Estrich (Decke = Hülle). */
  dachraumBeheizt?: boolean;
  keller?: 'unbeheizt' | 'beheizt' | 'keiner';
}

/** Standard-Satz an Bauteiltypen für ein Gebäude (IDs stabil: aw, dach, decke, boden, fenster, tuer, iw, id, it). */
export function standardBauteiltypen(o: StandardTypenOptionen = {}): Bauteiltyp[] {
  const typen: Bauteiltyp[] = [{ id: 'aw', art: 'aussenwand' }];
  const dachform = o.dachform ?? 'steil';
  if (o.dachraumBeheizt === false && dachform === 'steil') typen.push({ id: 'decke', art: 'deckeEstrich' });
  else typen.push({ id: 'dach', art: dachform === 'flach' ? 'dachFlach' : 'dachSteil' });
  const keller = o.keller ?? 'unbeheizt';
  typen.push({ id: 'boden', art: keller === 'unbeheizt' ? 'bodenKeller' : 'bodenErdreich' });
  typen.push({ id: 'fenster', art: 'fenster' }, { id: 'tuer', art: 'tuer' }, { id: 'iw', art: 'innenwand' }, { id: 'id', art: 'innendecke' }, { id: 'it', art: 'innentuer' });
  return typen;
}

export interface StufenOption {
  value: string | number | boolean | null;
  label: string;
}

export interface StufenDefinition {
  key: keyof Stufen;
  label: string;
  options: StufenOption[];
  /** Standardwert (Epoche/Vorlage), der gilt, solange die Stufe unbekannt ist. */
  standard: string | number | boolean | null;
  standardLabel: string;
}

/** Stufen-Definition für die UI (Optionen aus den Daten, Standardwert je Stufe sichtbar). */
export function stufenDefinition(art: BauteilArt, baujahr: number, stufen: Stufen, daten: HuelleDaten): StufenDefinition[] {
  const epoche = epocheFuerBaujahr(baujahr, daten);
  const cm = (m: number) => `${fmt(m * 100, 1)} cm`;
  if (art === 'fenster') {
    const ep = daten.fenster.epochen[epoche]!;
    return [
      { key: 'generation', label: 'Verglasung', options: daten.fenster.generationen.map((g) => ({ value: g.key, label: `${g.label} (Ug ${fmt(g.ug, 1)})` })), standard: ep.generation, standardLabel: daten.fenster.generationen.find((g) => g.key === ep.generation)?.label ?? ep.generation },
      { key: 'rahmen', label: 'Rahmen', options: Object.entries(daten.fenster.rahmen).map(([k, r]) => ({ value: k, label: `${r.label} (Uf ${fmt(r.uf, 1)})` })), standard: ep.rahmen, standardLabel: daten.fenster.rahmen[ep.rahmen]?.label ?? ep.rahmen },
    ];
  }
  if (art === 'tuer') {
    const ep = daten.tueren.epochen[epoche]!;
    return [{ key: 'typ', label: 'Türtyp', options: daten.tueren.typen.map((t) => ({ value: t.key, label: `${t.label} (U ${fmt(t.u, 1)})` })), standard: ep.typ, standardLabel: daten.tueren.typen.find((t) => t.key === ep.typ)?.label ?? ep.typ }];
  }
  if (istInnenArt(art)) {
    const ib = daten.innenbauteile[art];
    return [{ key: 'bauweise', label: 'Bauweise', options: Object.entries(ib.bauweisen).map(([k, b]) => ({ value: k, label: b.label })), standard: ib.default, standardLabel: ib.bauweisen[ib.default]?.label ?? ib.default }];
  }
  const bt = daten.bauteile[art]!;
  const def = bt.epochen[epoche]!;
  const bauweisen = daten.bauweisen[art] ?? {};
  const bwKey = stufen.bauweise ?? def.bauweise;
  const bw = bauweisen[bwKey];
  const kette = opakAufloesen(art, epoche, stufen, null, daten, [], 'ui');
  const trag = kette.kette.schichten.find((s) => s.rolle === 'tragschicht');
  const daemm = kette.kette.schichten.find((s) => s.rolle === 'daemmung');
  const defDaemm = def.schichten.find((s) => s.daemmstoff);
  const zweischalig = kette.kette.schichten.some((s) => s.rolle === 'aussenschale');
  const gesamtdicke = zweischalig ? kette.kette.schichten.filter((s) => ['tragschicht', 'aussenschale', 'luftschicht', 'daemmung'].includes(s.rolle)).reduce((a, s) => a + s.dickeM, 0) : trag?.dickeM;
  const dicken = bw?.dickenTypischM ?? (zweischalig ? [0.25, 0.3, 0.36, 0.4] : trag ? [trag.dickeM] : []);
  const daemmdicken = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.3];
  const out: StufenDefinition[] = [
    { key: 'bauweise', label: 'Bauweise', options: Object.entries(bauweisen).map(([k, b]) => ({ value: k, label: `${b.label}${b.epochenTypisch.includes(epoche) ? ' (typisch für die Epoche)' : ''}` })), standard: def.bauweise, standardLabel: bauweisen[def.bauweise]?.label ?? def.bauweise },
    { key: 'dickeM', label: zweischalig ? 'Dicke Mauerwerk gesamt (beide Schalen)' : 'Dicke Tragschicht', options: dicken.map((d) => ({ value: d, label: cm(d) })), standard: gesamtdicke ?? null, standardLabel: gesamtdicke !== undefined ? cm(gesamtdicke) : '—' },
    { key: 'daemmung', label: 'Gedämmt?', options: [{ value: true, label: 'Ja' }, { value: false, label: 'Nein' }], standard: !!defDaemm, standardLabel: defDaemm ? 'Ja' : 'Nein' },
  ];
  if (stufen.daemmung !== false && (daemm || stufen.daemmung === true)) {
    const dDef = daemm?.daemmstoff ?? defDaemm?.daemmstoff ?? daemmDefault(art, epoche, daten).daemmstoff ?? 'unbekannt';
    out.push(
      { key: 'daemmstoff', label: 'Dämmstoff', options: Object.entries(daten.daemmstoffe).map(([k, d]) => ({ value: k, label: `${d.label} (λ ${fmt(d.lambda, 3)})` })), standard: dDef, standardLabel: daten.daemmstoffe[dDef]?.label ?? dDef },
      { key: 'daemmdickeM', label: 'Dämmdicke', options: daemmdicken.map((d) => ({ value: d, label: cm(d) })), standard: daemm?.dickeM ?? null, standardLabel: daemm ? cm(daemm.dickeM) : '—' },
    );
  }
  return out;
}
