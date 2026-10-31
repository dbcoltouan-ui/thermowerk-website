/**
 * Wärmeabgabe / Heizkörper-Modul (KONTEXT §1 Priorität, §2 «Wärmeabgabe»; Zielbild befund_heizkoerper.md §6) —
 * reine Funktionen mit Herkunftsmodell, nutzbar in beiden Modi.
 *
 *   Q_N (75/65/20, EN 442)      aus Typenschild (±2 %) > Modell-DB (±5 %) > Bauart + Massen (Tabelle ±15 %)
 *                               > alte Heizkurve (Mindest-Q_N, ±30 %); Flächenheizung: Q bei 35/28/20
 *   Q(θ_VL, θ_RL, θ_i)          = Q_N · f_m · (Δθ_log / Δθ_log,N)^n         n aus EINER Tabelle (exponenten.werte)
 *   Δθ_log                      = (θ_VL − θ_RL) / ln((θ_VL − θ_i)/(θ_RL − θ_i))
 *   Raum                        Deckung = Σ Q(θ_VL,Ziel) / Φ_HL,Raum → Ampel; θ_VL,req per Bisektion: Σ Q(θ) = Φ_HL
 *                               (Spreizung je Heizkreis konstant, θ_RL = θ − Spreizung)
 *   Gebäude                     Auslegungs-VL = max θ_VL,req über beheizte, nicht ausgeklammerte Räume
 *                               → Ampel ≤ 55 / 55–65 / > 65 °C (WP-Tauglichkeit)
 *   Massnahmen (Deckung < 1)    Typ-Upgrade gleiche Nische, nötige Länge/Gliederzahl, FBH, Gebläsekonvektor, Hybrid
 *
 * Einheiten: W, °C, K, mm (Masse), m² (Flächenheizung). Daten als Parameter (heizkoerper-tabellen.json, fws.json,
 * sia384-2.json). Abgeleitete Werte (Q_N, n, f_m, θ_VL,req) leben nur im Ergebnis, nie im State.
 */
import type { FwsDaten } from '../daten/fws';
import type { FbhBelag, GliedZeile, HkDaten, HkModell } from '../daten/heizkoerper';
import type { Sia3842Daten } from '../daten/sia384';
import type { Ampel } from './typen';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fallback, fmt, istAnnahme, override, schaetzung, tabelle, unsicherheitSumme } from './wert';

/* ---------------------------------------------------------------------------------------------- */
/* Typen                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

export const BAUARTEN = [
  'platte_10', 'platte_11', 'platte_20', 'platte_21', 'platte_22', 'platte_30', 'platte_33',
  'guss_glieder', 'stahl_glieder',
  'roehren_2', 'roehren_3', 'roehren_4', 'roehren_5', 'roehren_6',
  'konvektor_passiv', 'konvektor_geblaese', 'bad_handtuch', 'design_vertikal', 'fbh', 'wandheizung',
] as const;
export type Bauart = (typeof BAUARTEN)[number];

export type Kategorie = 'platte' | 'glieder' | 'roehren' | 'konvektor' | 'bad' | 'vertikal' | 'flaeche';

/** Mass-Felder einer Heizfläche (bedingt je Kategorie, siehe `relevanteMasse`). */
export type MassFeld =
  | 'hoeheMm' | 'laengeMm' | 'tiefeMm' | 'nabenabstandMm' | 'glieder' | 'gliedbreiteMm'
  | 'einbau' | 'designTyp' | 'flaecheM2' | 'verlegeabstandMm' | 'belag' | 'rlb' | 'system';

export interface Typenschild {
  /** Leistung laut Typenschild/Datenblatt [W] bei den angegebenen Bezugstemperaturen. */
  qNW: number;
  tVLC: number;
  tRLC: number;
  tRaumC: number;
  /** Exponent laut Datenblatt (sonst Tabelle). */
  n?: number | undefined;
}

export interface Minderungen {
  /** Nischeneinbau: true = typische Minderung, Zahl = Minderung in %. */
  nische?: boolean | number | undefined;
  /** Verkleidung: true = typisch je Bauart, Zahl = %. */
  verkleidung?: boolean | number | undefined;
  /** Metallic-/Bronze-Lack: true = typisch, Zahl = %. */
  oberflaeche?: boolean | number | undefined;
  /** Anschlussart; «reitend» (VL und RL unten) mindert je Spreizung (f5) und Baulänge (f4). */
  anschluss?: 'wechselseitig' | 'reitend' | undefined;
}

export interface HeizflaecheEingabe {
  id: string;
  bauart: Bauart;
  kreisId?: string | undefined;
  bezeichnung?: string | undefined;
  /** Platte/Vertikal/Bad/Konvektor/Röhren: Bauhöhe; Glieder: Bauhöhe (alternativ Nabenabstand). */
  hoeheMm?: number | undefined;
  /** Baulänge (Vertikal/Bad: Baubreite); Glieder/Röhren ohne Gliederzahl: Länge → Gliederzahl. */
  laengeMm?: number | undefined;
  /** Bautiefe (Platte: Plausi; Glieder: Rechengrösse; Konvektor: Tiefe bzw. Kanalbreite). */
  tiefeMm?: number | undefined;
  nabenabstandMm?: number | undefined;
  glieder?: number | undefined;
  gliedbreiteMm?: number | undefined;
  /** Konvektor ohne Gebläse: verkleideter Wand-/Bankkonvektor oder Unterflur-Lamellenpaket. */
  einbau?: 'verkleidet' | 'unterflur' | undefined;
  /** Vertikal-HK: 2 Platten ohne (20) bzw. mit Konvektorblechen (22). */
  designTyp?: '20' | '22' | undefined;
  /** Flächenheizung: belegte Fläche [m²]. */
  flaecheM2?: number | undefined;
  verlegeabstandMm?: number | undefined;
  belag?: FbhBelag | undefined;
  /** Wärmeleitwiderstand Belag Rλ,B [m²K/W] (gewinnt über `belag`). */
  rlb?: number | undefined;
  /** Wandheizung: Trockenbau-Element oder Nassputz-Register. */
  system?: 'trockenbau' | 'nassputz' | undefined;
  modellId?: string | undefined;
  typenschild?: Typenschild | undefined;
  minderungen?: Minderungen | undefined;
  /** Exponent manuell (gewinnt über Tabelle/Modell/Typenschild). */
  nOverride?: number | undefined;
}

export interface HeizkreisEingabe {
  id: string;
  bezeichnung?: string | undefined;
  /** Geplante Vorlauftemperatur des Kreises [°C] (Deckung wird hier geprüft). */
  tVLC?: number | undefined;
  spreizungK?: number | undefined;
  /** Gemischter Kreis (Mischer): Vorlauf bleibt bei `tVLC`, auch wenn der Erzeuger höher fährt. */
  gemischt?: boolean | undefined;
}

export interface WaermeabgabeRaumEingabe {
  id: string;
  name: string;
  /** Raumtyp-Key (sia384-2.json) für θ_int-Default. */
  typ?: string | undefined;
  thetaIntC?: number | undefined;
  /** θ_int aus der raumweisen Rechnung (gewinnt über thetaIntC/typ). */
  thetaInt?: Wert | undefined;
  /** Netto-Raumfläche [m²] (Verteilung im FWS-Modus, FBH-Massnahme). */
  flaecheM2?: number | undefined;
  /** Φ_HL des Raums aus der raumweisen Rechnung. */
  phiHL?: Wert | undefined;
  /** Φ_HL des Raums manuell [W]. */
  phiHLManuellW?: number | undefined;
  beheizt?: boolean | undefined;
  /** Raum aus dem Gebäude-Maximum ausklammern (wird saniert, Elektro-Zusatz …). */
  ausklammern?: boolean | undefined;
  ausklammernGrund?: string | undefined;
  heizflaechen: HeizflaecheEingabe[];
}

export interface WaermeabgabeEingabe {
  heizkreise?: HeizkreisEingabe[] | undefined;
  raeume: WaermeabgabeRaumEingabe[];
  /** Gebäude-Ziel-VL für Deckung und Massnahmen [°C] (Default: Grenze «gut» 55 °C). */
  zielVLC?: number | undefined;
  /** FWS-Modus ohne raumweise Heizlast: Gebäude-Q_hl nach Raumfläche verteilen. */
  verteilung?: { qhl: Wert; ebfM2?: number | undefined } | undefined;
  /** Alte Heizkurve bei Auslegungs-Aussentemperatur (Fallback-Stufe für unbekannte Masse). */
  heizkurveAlt?: { tVLC: number; tRLC?: number | undefined } | undefined;
  /** Auslegungs-VL manuell (gewinnt, mit Hinweis). */
  auslegungsVLOverrideC?: number | undefined;
}

export interface WaermeabgabeDaten {
  hk: HkDaten;
  fws: FwsDaten;
  sia: Sia3842Daten;
}

export type QnStufe = 'typenschild' | 'modell' | 'bauartMasse' | 'heizkurve' | 'fehlt';

export interface Bezug {
  tVL: number;
  tRL: number;
  tInt: number;
}

export interface HeizflaecheErgebnis {
  id: string;
  raumId: string;
  bauart: Bauart;
  bauartLabel: string;
  kategorie: Kategorie;
  kreisId: string | null;
  stufe: QnStufe;
  /** Normleistung bei `bezug` (Radiatoren 75/65/20, Flächenheizung 35/28/20) ohne Minderungen [W]. */
  qN: Wert | null;
  bezug: Bezug;
  n: Wert;
  /** Gesamtminderungsfaktor f_m = f1·f2·f3·f4·f5 [-]. */
  fm: Wert;
  spreizung: Wert;
  /** Vorlauf, bei dem die Deckung geprüft wird [°C]. */
  vlZiel: Wert;
  /** Leistung bei vlZiel/vlZiel − Spreizung/θ_int [W]. */
  qZiel: Wert | null;
  /**
   * Werte, die der Kern für nicht angegebene Masse einsetzt (Standardwert, Tabelle, aus der Länge geschätzt) —
   * die UI zeigt sie als Zahl im Feld mit Herkunft (Daniel 29.10. «Standardwerte sichtbar»).
   */
  standardwerte: StandardMasse;
  hinweise: Hinweis[];
}

/** Eingesetzte Werte für leere Mass-Felder einer Heizfläche (nur Felder, für die der Kern etwas einsetzt). */
export type StandardMasse = Partial<Record<MassFeld, Wert<number> | Wert<string>>>;

export type MassnahmeArt = 'typUpgrade' | 'laenge' | 'glieder' | 'fbh' | 'geblaesekonvektor' | 'hybrid';

export interface Massnahme {
  art: MassnahmeArt;
  heizflaecheId?: string;
  nachBauart?: Bauart;
  /** Nötige Vorlauftemperatur des Raums nach der Massnahme [°C] (null = auch bei Suchgrenze nicht gedeckt). */
  tVLReqNeu?: number | null;
  /** Nötige Baulänge [mm] bzw. Gliederzahl bzw. FBH-Fläche [m²] bzw. Q_N [W]. */
  bedarf?: number;
  einheit?: string;
  text: string;
}

export interface RaumWaermeabgabe {
  id: string;
  name: string;
  beheizt: boolean;
  ausgeklammert: boolean;
  thetaInt: Wert;
  phiHL: Wert | null;
  heizflaechen: HeizflaecheErgebnis[];
  /** Σ Q bei Ziel-VL [W]. */
  qZiel: Wert | null;
  /** Höchste Ziel-VL der Heizflächen des Raums [°C]. */
  vlZiel: Wert;
  deckung: Wert | null;
  ampel: Ampel;
  /** Nötige Vorlauftemperatur [°C]; null bei fehlender Heizlast/Heizfläche oder nicht erreichbar. */
  tVLReq: Wert | null;
  erreichbar: boolean;
  /** Heizflächen hinter einem Mischer (gedeckelter Kreis) decken Φ_HL beim Kreis-Vorlauf nicht; θ_VL,req gilt dann ohne Deckel (Audit S12, HK §3.1). */
  mischerGrenze: { kreisVLC: number; qBeiKreisVL: number } | null;
  massnahmen: Massnahme[];
  hinweise: Hinweis[];
}

export interface KritischerRaum {
  raumId: string;
  name: string;
  /** null = auch bei Suchgrenze nicht gedeckt. */
  tVLReq: number | null;
}

export interface WaermeabgabeGebaeude {
  /** Ziel-Vorlauf für Deckung und Massnahmen (Eingabe oder Standardwert 55 °C) — Standard der Heizkreis-Vorläufe. */
  zielVL: Wert;
  /** Einzige VL für Gerätefilter, MAG und Bericht [°C]. */
  auslegungsVL: Wert | null;
  /** Wert aus den Heizflächen (auch wenn ein Override gilt). */
  auslegungsVLAusHeizflaechen: Wert | null;
  ampel: Ampel;
  urteil: string;
  /** Die drei Räume mit der höchsten θ_VL,req. */
  kritischeRaeume: KritischerRaum[];
  /** Raum mit dem Maximum (massgebend). */
  massgebenderRaum: KritischerRaum | null;
  raeumeBewertet: number;
  raeumeRot: number;
  ausgeklammert: { raumId: string; name: string; grund: string | null }[];
}

export interface WaermeabgabeErgebnis {
  raeume: RaumWaermeabgabe[];
  gebaeude: WaermeabgabeGebaeude;
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
  vollstaendig: boolean;
}

/* ---------------------------------------------------------------------------------------------- */
/* Primitive (übernommen aus alt-calc/distribution.mjs dTm/leistungsFaktor, Befund HK-01)            */
/* ---------------------------------------------------------------------------------------------- */

/** Logarithmische Übertemperatur Δθ_log [K] (EN 442-2); Limes arithmetisch bei Δθ₁ ≈ Δθ₂; 0, wenn θ_RL ≤ θ_i. */
export function dTlog(tVL: number, tRL: number, tInt: number): number {
  const a = tVL - tInt;
  const b = tRL - tInt;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return 0;
  if (Math.abs(a - b) < 1e-6) return (a + b) / 2;
  return (a - b) / Math.log(a / b);
}

/** Leistungsfaktor f = (Δθ_log / Δθ_log,Bezug)^n. */
export function leistungsfaktor(tVL: number, tRL: number, tInt: number, n: number, bezug: Bezug = BEZUG_RADIATOR): number {
  const d = dTlog(tVL, tRL, tInt);
  const dRef = dTlog(bezug.tVL, bezug.tRL, bezug.tInt);
  if (!(d > 0) || !(dRef > 0)) return 0;
  return (d / dRef) ** n;
}

export const BEZUG_RADIATOR: Bezug = { tVL: 75, tRL: 65, tInt: 20 };
export const BEZUG_FLAECHE: Bezug = { tVL: 35, tRL: 28, tInt: 20 };

/**
 * θ_VL per Bisektion: kleinstes θ ∈ [lo, hi] mit f(θ) ≥ ziel (f monoton nicht fallend). Exakt mit log. Übertemperatur,
 * keine arithmetische Näherung (Befund HK-02). Toleranz 0.001 K. `null`, wenn f(hi) < ziel.
 */
export function bisektionVorlauf(f: (theta: number) => number, ziel: number, lo: number, hi: number): number | null {
  if (!(ziel > 0)) return null;
  if (f(hi) < ziel) return null;
  let a = lo;
  let b = hi;
  for (let i = 0; i < 200 && b - a > 1e-3; i++) {
    const m = (a + b) / 2;
    if (f(m) >= ziel) b = m;
    else a = m;
  }
  return b;
}

/** Arithmetische Näherung des alten Tools (nur für den Vergleichstest): θ_VL = θ_i + Δθ_req + Spreizung/2. */
export function vorlaufNaeherungArithmetisch(phiW: number, qNW: number, n: number, tInt: number, spreizungK: number): number {
  const dReq = dTlog(75, 65, 20) * (phiW / qNW) ** (1 / n);
  return tInt + dReq + spreizungK / 2;
}

/* ---------------------------------------------------------------------------------------------- */
/* Interpolation                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

interface Punkt {
  x: number;
  w: number;
}

interface Interp {
  w: number;
  extrapoliert: boolean;
}

/** Linear zwischen Stützpunkten; ausserhalb proportional zum nächsten Stützpunkt (w ∝ x), markiert. */
export function interpoliere1(punkte: ReadonlyArray<Punkt>, x: number): Interp | null {
  const p = [...punkte].filter((q) => Number.isFinite(q.w)).sort((a, b) => a.x - b.x);
  if (!p.length || !Number.isFinite(x) || x < 0) return null;
  const erster = p[0]!;
  const letzter = p[p.length - 1]!;
  if (Math.abs(x - erster.x) < 1e-9) return { w: erster.w, extrapoliert: false };
  if (x < erster.x) return { w: (erster.w * x) / erster.x, extrapoliert: true };
  if (x > letzter.x) return { w: (letzter.w * x) / letzter.x, extrapoliert: true };
  for (let i = 1; i < p.length; i++) {
    const u = p[i - 1]!;
    const o = p[i]!;
    if (x <= o.x) return { w: u.w + ((o.w - u.w) * (x - u.x)) / (o.x - u.x), extrapoliert: false };
  }
  return { w: letzter.w, extrapoliert: false };
}

interface Gruppe {
  x: number;
  punkte: Punkt[];
}

/** Zweidimensional: je Gruppe (x) über y interpolieren, dann über x (ausserhalb proportional). */
export function interpoliere2(gruppen: ReadonlyArray<Gruppe>, x: number, y: number): Interp | null {
  const werte: { x: number; i: Interp }[] = [];
  for (const g of gruppen) {
    const i = interpoliere1(g.punkte, y);
    if (i) werte.push({ x: g.x, i });
  }
  if (!werte.length) return null;
  const r = interpoliere1(werte.map((v) => ({ x: v.x, w: v.i.w })), x);
  if (!r) return null;
  // beteiligte Gruppen: die beiden Nachbarn von x
  const sortiert = [...werte].sort((a, b) => a.x - b.x);
  let beteiligt = sortiert.filter((v) => Math.abs(v.x - x) < 1e-9);
  if (!beteiligt.length) {
    const unten = [...sortiert].reverse().find((v) => v.x < x);
    const oben = sortiert.find((v) => v.x > x);
    beteiligt = [unten, oben].filter((v): v is { x: number; i: Interp } => !!v);
  }
  return { w: r.w, extrapoliert: r.extrapoliert || beteiligt.some((v) => v.i.extrapoliert) };
}

function gruppiere<T>(zeilen: ReadonlyArray<T>, gx: (z: T) => number, py: (z: T) => number, pw: (z: T) => number): Gruppe[] {
  const map = new Map<number, Map<number, number[]>>();
  for (const z of zeilen) {
    const x = gx(z);
    const y = py(z);
    if (!map.has(x)) map.set(x, new Map());
    const m = map.get(x)!;
    if (!m.has(y)) m.set(y, []);
    m.get(y)!.push(pw(z));
  }
  return [...map.entries()].map(([x, m]) => ({ x, punkte: [...m.entries()].map(([yy, ws]) => ({ x: yy, w: ws.reduce((s, v) => s + v, 0) / ws.length })) }));
}

/* ---------------------------------------------------------------------------------------------- */
/* Stammdaten-Hilfen                                                                               */
/* ---------------------------------------------------------------------------------------------- */

const Q_EN442 = 'EN 442-2 (Δθ_log, Bezug 75/65/20); heizkoerper-tabellen.json';

export function bauartDaten(bauart: string, daten: HkDaten) {
  return daten.bauarten.find((b) => b.key === bauart);
}

export function kategorieVon(bauart: Bauart, daten: HkDaten): Kategorie {
  const k = bauartDaten(bauart, daten)?.kategorie;
  return (k === 'platte' || k === 'glieder' || k === 'roehren' || k === 'konvektor' || k === 'bad' || k === 'vertikal' || k === 'flaeche' ? k : 'platte');
}

/** Mass-Felder, die für eine Bauart abgefragt und gerechnet werden (UI-Relevanz, Typ-Wechsel). */
export function relevanteMasse(bauart: Bauart, daten: HkDaten): MassFeld[] {
  switch (kategorieVon(bauart, daten)) {
    case 'platte':
      return ['hoeheMm', 'laengeMm', 'tiefeMm'];
    case 'vertikal':
      return ['hoeheMm', 'laengeMm', 'designTyp'];
    case 'bad':
      return ['hoeheMm', 'laengeMm'];
    case 'glieder':
      return ['hoeheMm', 'nabenabstandMm', 'tiefeMm', 'glieder', 'gliedbreiteMm', 'laengeMm'];
    case 'roehren':
      return ['hoeheMm', 'glieder', 'laengeMm', 'tiefeMm'];
    case 'konvektor':
      return bauart === 'konvektor_geblaese' ? ['laengeMm'] : ['hoeheMm', 'tiefeMm', 'laengeMm', 'einbau'];
    case 'flaeche':
      return bauart === 'wandheizung' ? ['flaecheM2', 'system'] : ['flaecheM2', 'verlegeabstandMm', 'belag', 'rlb'];
  }
}

/**
 * Standardwerte für leere Mass-Felder — genau die Zahlen, die `qnAusMassen` einsetzt (gleiche Daten, gleiche Regeln),
 * damit die UI sie als Zahl mit Herkunft im Feld zeigen kann. Nur für Felder, die die Bauart nutzt und die leer sind.
 */
export function standardMasse(e: HeizflaecheEingabe, raumTyp: string | undefined, daten: HkDaten): StandardMasse {
  const out: StandardMasse = {};
  const a = daten.auslegung;
  const kat = kategorieVon(e.bauart, daten);
  const quelleA = quellenText(a.quelle, daten);
  const leer = (v: number | undefined) => !(v !== undefined && v > 0);
  if (kat === 'glieder') {
    const tab = e.bauart === 'stahl_glieder' ? daten.glieder.stahl : daten.glieder.guss;
    if (leer(e.tiefeMm)) out.tiefeMm = fallback(a.gussTiefeDefaultMm, 'mm', `Bautiefe ${fmt(a.gussTiefeDefaultMm, 0)} mm — häufigste Bautiefe im CH-Bestand (Standardwert)`, { stufe: 'standardwert', quelle: quelleA });
    const breite = leer(e.gliedbreiteMm) ? tab.gliedbreiteMm : e.gliedbreiteMm!;
    if (leer(e.gliedbreiteMm)) out.gliedbreiteMm = tabelle(tab.gliedbreiteMm, 'mm', `Gliedbreite ${fmt(tab.gliedbreiteMm, 0)} mm (${e.bauart === 'stahl_glieder' ? 'Stahl' : 'Guss'}-Glieder DIN 4703)`, quellenText(daten.glieder.quelle, daten));
    const n = leer(e.glieder) ? gliederAusLaenge(e.laengeMm, breite) : null;
    if (n !== null) out.glieder = schaetzung(n, 'Gl.', `${n} Glieder aus Baulänge ${fmt(e.laengeMm ?? 0, 0)} mm / ${fmt(breite, 0)} mm — Glieder zählen ist genauer`, { stufe: 'ausLaenge' });
  }
  if (kat === 'roehren' && leer(e.glieder)) {
    const ch = daten.roehren.charleston;
    const n = gliederAusLaenge(e.laengeMm, ch.gliedbreiteMm, 26);
    if (n !== null) out.glieder = schaetzung(n, 'Gl.', `${n} Glieder aus Baulänge: (${fmt(e.laengeMm ?? 0, 0)} − 26) / ${fmt(ch.gliedbreiteMm, 0)} mm — Glieder zählen ist genauer`, { stufe: 'ausLaenge' });
  }
  if (kat === 'konvektor' && e.bauart !== 'konvektor_geblaese' && !e.einbau) {
    const einbau = a.konvektorEinbauDefault === 'unterflur' ? 'unterflur' : 'verkleidet';
    out.einbau = fallback<string>(einbau, '', `Einbau ${einbau === 'unterflur' ? 'Unterflur' : 'verkleidet (Wand/Bank)'} (Standardwert)`, { stufe: 'standardwert', quelle: quelleA });
  }
  if (kat === 'vertikal' && !e.designTyp) out.designTyp = fallback<string>('22', '', 'Typ 22 (2 Platten mit Konvektorblechen, Standardwert)', { stufe: 'standardwert', quelle: quelleA });
  if (e.bauart === 'fbh') {
    if (leer(e.verlegeabstandMm)) out.verlegeabstandMm = fallback(a.fbhDefault.verlegeabstandMm, 'mm', `Verlegeabstand ${fmt(a.fbhDefault.verlegeabstandMm, 0)} mm (Standardwert)`, { stufe: 'standardwert', quelle: quelleA });
    if (!(e.rlb !== undefined && e.rlb >= 0)) {
      if (e.belag) {
        const r = daten.fbh.rlbTypisch[e.belag];
        out.rlb = tabelle(r, 'm²K/W', `Wärmeleitwiderstand Belag ${e.belag}: Rλ,B ${fmt(r, 2)} m²K/W (typisch)`, quellenText(daten.fbh.quelle, daten));
      } else {
        const bad = raumTyp === 'bad' || raumTyp === 'dusche';
        const r = bad ? a.fbhDefault.rlbBad : a.fbhDefault.rlb;
        out.rlb = fallback(r, 'm²K/W', `Belag Rλ,B ${fmt(r, 2)} m²K/W (${bad ? 'Bad, Keramik' : 'Wohnraum'}, Standardwert)`, { stufe: 'standardwert', quelle: quelleA });
      }
    }
  }
  return out;
}

const PLATTEN_REIHENFOLGE: ReadonlyArray<Bauart> =['platte_10', 'platte_11', 'platte_20', 'platte_21', 'platte_22', 'platte_30', 'platte_33'];

/**
 * Typ-Wechsel (Befund HK-20): neue Heizfläche mit gleicher ID, Kreis und Bezeichnung; Masse bleiben nur, wenn die neue
 * Bauart sie ebenfalls nutzt (Platte ↔ Platte behält Höhe/Länge = «gleiche Nische»); Modell und Typenschild gehören zur
 * alten Bauart und werden verworfen, Minderungen nur bei Radiator → Radiator behalten.
 */
export function heizflaecheBauartWechseln(hf: HeizflaecheEingabe, neueBauart: Bauart, daten: HkDaten): HeizflaecheEingabe {
  const neu: HeizflaecheEingabe = { id: hf.id, bauart: neueBauart };
  if (hf.kreisId !== undefined) neu.kreisId = hf.kreisId;
  if (hf.bezeichnung !== undefined) neu.bezeichnung = hf.bezeichnung;
  const katAlt = kategorieVon(hf.bauart, daten);
  const katNeu = kategorieVon(neueBauart, daten);
  if (katAlt !== katNeu) {
    if (katAlt !== 'flaeche' && katNeu !== 'flaeche' && hf.minderungen) neu.minderungen = hf.minderungen;
    return neu;
  }
  const behalten = new Set(relevanteMasse(neueBauart, daten));
  for (const f of behalten) {
    const v = hf[f];
    if (v !== undefined) (neu as unknown as Record<string, unknown>)[f] = v;
  }
  if (katNeu === 'platte' && neu.tiefeMm !== undefined) delete neu.tiefeMm; // Tiefe gehört zum alten Typ
  if (hf.minderungen && katNeu !== 'flaeche') neu.minderungen = hf.minderungen;
  return neu;
}

/* ---------------------------------------------------------------------------------------------- */
/* Normleistung je Heizfläche                                                                     */
/* ---------------------------------------------------------------------------------------------- */

interface QnRoh {
  wert: number;
  stufe: QnStufe;
  begruendung: string;
  quelle: string;
  extrapoliert: boolean;
  standardMasse: string[];
  bezug: Bezug;
  /** Obergrenze Q (FBH Oberflächentemperatur) [W]. */
  qMaxW?: number;
  nModell?: number;
  hinweise: Hinweis[];
}

interface Aufgeloest {
  e: HeizflaecheEingabe;
  raumId: string;
  bauart: Bauart;
  label: string;
  kat: Kategorie;
  qN: Wert | null;
  stufe: QnStufe;
  bezug: Bezug;
  n: Wert;
  qMaxW?: number;
  hinweise: Hinweis[];
}

function h(stufe: Hinweis['stufe'], code: string, text: string, pfad?: string): Hinweis {
  return pfad ? { stufe, code, text, pfad } : { stufe, code, text };
}

function quellenText(ids: ReadonlyArray<string>, daten: HkDaten): string {
  return ids.map((id) => daten._meta.quellen.find((q) => q.id === id)?.titel ?? id).join('; ');
}

function gliederAusLaenge(laengeMm: number | undefined, breiteMm: number, zuschlagMm = 0): number | null {
  if (!(laengeMm && laengeMm > 0)) return null;
  return Math.max(1, Math.round((laengeMm - zuschlagMm) / breiteMm));
}

/** Normleistung aus Bauart + Massen (Tabellen). */
function qnAusMassen(e: HeizflaecheEingabe, raumTyp: string | undefined, daten: HkDaten): QnRoh | null {
  const kat = kategorieVon(e.bauart, daten);
  const a = daten.auslegung;
  const hinweise: Hinweis[] = [];
  const standardMasse: string[] = [];
  const pfad = (f: string) => `waermeabgabe.heizflaechen.${e.id}.${f}`;

  if (kat === 'platte') {
    const typ = e.bauart.replace('platte_', '');
    const tab = daten.platten.wProM7565[typ];
    if (!tab || !(e.hoeheMm && e.hoeheMm > 0) || !(e.laengeMm && e.laengeMm > 0)) return null;
    const i = interpoliere1(Object.entries(tab).map(([x, w]) => ({ x: Number(x), w })), e.hoeheMm);
    if (!i) return null;
    plattenTiefePlausi(e, daten, hinweise);
    return {
      wert: (i.w * e.laengeMm) / 1000,
      stufe: 'bauartMasse',
      begruendung: `Typ ${typ} H ${fmt(e.hoeheMm, 0)} mm: ${fmt(i.w, 0)} W/m${i.extrapoliert ? ' (ausserhalb 300–900 mm, proportional extrapoliert)' : ' (interpoliert, Mittel aus 6 Herstellern)'} × ${fmt(e.laengeMm / 1000, 3)} m`,
      quelle: quellenText(daten.platten.quelle, daten),
      extrapoliert: i.extrapoliert,
      standardMasse,
      bezug: BEZUG_RADIATOR,
      hinweise,
    };
  }

  if (kat === 'glieder') {
    const tabelleG = e.bauart === 'stahl_glieder' ? daten.glieder.stahl : daten.glieder.guss;
    const breite = e.gliedbreiteMm && e.gliedbreiteMm > 0 ? e.gliedbreiteMm : tabelleG.gliedbreiteMm;
    let anzahl = e.glieder && e.glieder > 0 ? Math.round(e.glieder) : null;
    let anzahlText = anzahl !== null ? `${anzahl} Glieder` : '';
    if (anzahl === null) {
      anzahl = gliederAusLaenge(e.laengeMm, breite);
      if (anzahl === null) return null;
      anzahlText = `${anzahl} Glieder (aus Länge ${fmt(e.laengeMm ?? 0, 0)} mm / ${fmt(breite, 0)} mm)`;
      hinweise.push(h('info', 'waermeabgabe.glieder.ausLaenge', `Gliederzahl aus der Baulänge geschätzt (${anzahlText}); Glieder zählen ist genauer.`, pfad('glieder')));
    }
    let tiefe = e.tiefeMm;
    if (!(tiefe && tiefe > 0)) {
      tiefe = a.gussTiefeDefaultMm;
      standardMasse.push(`Bautiefe ${fmt(tiefe, 0)} mm (Standardwert)`);
    }
    const zeilen: GliedZeile[] = tabelleG.werte;
    let x: number;
    let gx: (z: GliedZeile) => number;
    let hoeheText: string;
    if (e.nabenabstandMm && e.nabenabstandMm > 0) {
      x = e.nabenabstandMm;
      gx = (z) => z.nabenabstandMm;
      hoeheText = `Nabenabstand ${fmt(x, 0)} mm`;
    } else if (e.hoeheMm && e.hoeheMm > 0) {
      x = e.hoeheMm;
      gx = (z) => z.bauhoeheMm;
      hoeheText = `Bauhöhe ${fmt(x, 0)} mm`;
    } else return null;
    // gemessene Höhe auf DIN-4703-Bauhöhe einrasten (reale Radiatoren gibt es nur in diesen Stufen)
    const stufen = [...new Set(zeilen.map(gx))];
    const naechste = stufen.reduce((b, s) => (Math.abs(s - x) < Math.abs(b - x) ? s : b), stufen[0] ?? x);
    if (Math.abs(naechste - x) <= a.hoeheEinrastenToleranzMm && naechste !== x) {
      hoeheText += ` → DIN-Stufe ${fmt(naechste, 0)} mm`;
      x = naechste;
    }
    const i = interpoliere2(gruppiere(zeilen, gx, (z) => z.tiefeMm, (z) => z.w7565), x, tiefe);
    if (!i) return null;
    return {
      wert: i.w * anzahl,
      stufe: 'bauartMasse',
      begruendung: `${e.bauart === 'stahl_glieder' ? 'Stahl' : 'Guss'}-Glieder DIN 4703, ${hoeheText}, Tiefe ${fmt(tiefe, 0)} mm: ${fmt(i.w, 1)} W/Glied${i.extrapoliert ? ' (extrapoliert)' : ''} × ${anzahlText}`,
      quelle: quellenText(daten.glieder.quelle, daten),
      extrapoliert: i.extrapoliert,
      standardMasse,
      bezug: BEZUG_RADIATOR,
      hinweise,
    };
  }

  if (kat === 'roehren') {
    const saeulen = e.bauart.replace('roehren_', '');
    const ch = daten.roehren.charleston;
    if (!(e.hoeheMm && e.hoeheMm > 0)) return null;
    let anzahl = e.glieder && e.glieder > 0 ? Math.round(e.glieder) : null;
    let anzahlText = anzahl !== null ? `${anzahl} Glieder` : '';
    if (anzahl === null) {
      anzahl = gliederAusLaenge(e.laengeMm, ch.gliedbreiteMm, 26);
      if (anzahl === null) return null;
      anzahlText = `${anzahl} Glieder (aus Länge: (L − 26)/46 mm)`;
      hinweise.push(h('info', 'waermeabgabe.glieder.ausLaenge', `Gliederzahl aus der Baulänge geschätzt (${anzahlText}).`, pfad('glieder')));
    }
    const pkt = Object.entries(ch.wProElement7565).flatMap(([hh, je]) => (je[saeulen] !== undefined ? [{ x: Number(hh), w: je[saeulen]! }] : []));
    const i = interpoliere1(pkt, e.hoeheMm);
    if (!i) return null;
    const tiefeTyp = ch.tiefeMmJeSaeulen[saeulen];
    if (e.tiefeMm && tiefeTyp && Math.abs(e.tiefeMm - tiefeTyp) > 25) {
      const passend = Object.entries(ch.tiefeMmJeSaeulen).reduce((b, [s, t]) => (Math.abs(t - e.tiefeMm!) < Math.abs(ch.tiefeMmJeSaeulen[b]! - e.tiefeMm!) ? s : b), saeulen);
      hinweise.push(h('warnung', 'waermeabgabe.roehren.tiefe', `Bautiefe ${fmt(e.tiefeMm, 0)} mm passt eher zu einem ${passend}-Säuler (${saeulen}-Säuler ≈ ${fmt(tiefeTyp, 0)} mm).`, pfad('bauart')));
    }
    return {
      wert: i.w * anzahl,
      stufe: 'bauartMasse',
      begruendung: `Röhrenradiator ${saeulen}-säulig H ${fmt(e.hoeheMm, 0)} mm: ${fmt(i.w, 1)} W/Glied${i.extrapoliert ? ' (extrapoliert)' : ''} × ${anzahlText}`,
      quelle: quellenText(daten.roehren.quelle, daten),
      extrapoliert: i.extrapoliert,
      standardMasse,
      bezug: BEZUG_RADIATOR,
      hinweise,
    };
  }

  if (kat === 'konvektor') {
    if (e.bauart === 'konvektor_geblaese') return null; // nur Typenschild/Datenblatt (Hinweis in normleistung)
    if (!(e.hoeheMm && e.hoeheMm > 0) || !(e.tiefeMm && e.tiefeMm > 0) || !(e.laengeMm && e.laengeMm > 0)) return null;
    let einbau = e.einbau;
    if (!einbau) {
      einbau = a.konvektorEinbauDefault === 'unterflur' ? 'unterflur' : 'verkleidet';
      standardMasse.push(`Einbau ${einbau === 'unterflur' ? 'Unterflur' : 'verkleidet (Wand/Bank)'} (Standardwert)`);
    }
    let i: Interp | null;
    let text: string;
    if (einbau === 'unterflur') {
      const gr: Gruppe[] = Object.entries(daten.konvektoren.lamellenpaket.wProM7565und5545).map(([hh, je]) => ({
        x: Number(hh),
        punkte: Object.entries(je).map(([b, w]) => ({ x: Number(b), w: w[0] ?? NaN })),
      }));
      i = interpoliere2(gr, e.hoeheMm, e.tiefeMm);
      text = `Unterflur-Lamellenpaket H ${fmt(e.hoeheMm, 0)} × B ${fmt(e.tiefeMm, 0)} mm`;
    } else {
      const zeilen = daten.konvektoren.wandkonvektorVerkleidet.werte.filter((z) => z.hoeheMm <= 300);
      i = interpoliere2(gruppiere(zeilen, (z) => z.tiefeMm, (z) => z.hoeheMm, (z) => z.wProM7565), e.tiefeMm, e.hoeheMm);
      text = `verkleideter Konvektor H ${fmt(e.hoeheMm, 0)} × T ${fmt(e.tiefeMm, 0)} mm`;
    }
    if (!i) return null;
    return {
      wert: (i.w * e.laengeMm) / 1000,
      stufe: 'bauartMasse',
      begruendung: `${text}: ${fmt(i.w, 0)} W/m${i.extrapoliert ? ' (extrapoliert)' : ''} × ${fmt(e.laengeMm / 1000, 3)} m`,
      quelle: quellenText(daten.konvektoren.quelle, daten),
      extrapoliert: i.extrapoliert,
      standardMasse,
      bezug: BEZUG_RADIATOR,
      hinweise,
    };
  }

  if (kat === 'bad') {
    if (!(e.hoeheMm && e.hoeheMm > 0) || !(e.laengeMm && e.laengeMm > 0)) return null;
    const i = interpoliere2(gruppiere(daten.bad.kermiBasicD, (z) => z.hoeheMm, (z) => z.breiteMm, (z) => z.w7565), e.hoeheMm, e.laengeMm);
    if (!i) return null;
    return {
      wert: i.w,
      stufe: 'bauartMasse',
      begruendung: `Bad-/Handtuchheizkörper ${fmt(e.hoeheMm, 0)} × ${fmt(e.laengeMm, 0)} mm: ${fmt(i.w, 0)} W${i.extrapoliert ? ' (extrapoliert)' : ' (interpoliert, Rohrregister einlagig)'}`,
      quelle: quellenText(daten.bad.quelle, daten),
      extrapoliert: i.extrapoliert,
      standardMasse,
      bezug: BEZUG_RADIATOR,
      hinweise,
    };
  }

  if (kat === 'vertikal') {
    if (!(e.hoeheMm && e.hoeheMm > 0) || !(e.laengeMm && e.laengeMm > 0)) return null;
    let typ = e.designTyp;
    if (!typ) {
      typ = '22';
      standardMasse.push('Typ 22 (2 Platten mit Konvektorblechen, Standardwert)');
    }
    const tab = daten.vertikal.stelradVertex.wProMBreite[typ === '20' ? 'P2' : 'K2'];
    if (!tab) return null;
    const i = interpoliere1(Object.entries(tab).map(([x, w]) => ({ x: Number(x), w })), e.hoeheMm);
    if (!i) return null;
    return {
      wert: (i.w * e.laengeMm) / 1000,
      stufe: 'bauartMasse',
      begruendung: `Vertikal-HK Typ ${typ} H ${fmt(e.hoeheMm, 0)} mm: ${fmt(i.w, 0)} W/m Baubreite${i.extrapoliert ? ' (ausserhalb 1800–2200 mm, extrapoliert)' : ''} × ${fmt(e.laengeMm / 1000, 3)} m`,
      quelle: quellenText(daten.vertikal.quelle, daten),
      extrapoliert: i.extrapoliert,
      standardMasse,
      bezug: BEZUG_RADIATOR,
      hinweise,
    };
  }

  // Flächenheizung
  if (!(e.flaecheM2 && e.flaecheM2 > 0)) return null;
  if (e.bauart === 'wandheizung') {
    const sys = e.system;
    let q3528: number;
    let text: string;
    if (sys === 'trockenbau' || sys === 'nassputz') {
      const t = sys === 'trockenbau' ? daten.wandheizung.wemKlimaelement : daten.wandheizung.wemKlimaregister;
      const q3530 = t['3530'] ?? daten.wandheizung.fallbackQ3528Wm2;
      q3528 = q3530 * leistungsfaktor(35, 28, 20, 1.1, { tVL: 35, tRL: 30, tInt: 20 });
      text = `Wandheizung ${sys === 'trockenbau' ? 'Trockenbau' : 'Nassputz'} ${fmt(q3530, 0)} W/m² bei 35/30 → ${fmt(q3528, 0)} W/m² bei 35/28`;
    } else {
      q3528 = daten.wandheizung.fallbackQ3528Wm2;
      standardMasse.push('System unbekannt: 80 W/m² bei 35/28 (Standardwert)');
      text = `Wandheizung ${fmt(q3528, 0)} W/m² bei 35/28`;
    }
    return {
      wert: q3528 * e.flaecheM2,
      stufe: 'bauartMasse',
      begruendung: `${text} × ${fmt(e.flaecheM2, 1)} m²`,
      quelle: quellenText(daten.wandheizung.quelle, daten),
      extrapoliert: false,
      standardMasse,
      bezug: BEZUG_FLAECHE,
      hinweise,
    };
  }
  // FBH: q bei ΔθH 15 K (40/30/20) aus Tabelle Rλ,B × VA, dann mit n 1.1 auf 35/28/20
  const f = daten.fbh;
  let va = e.verlegeabstandMm;
  if (!(va && va > 0)) {
    va = a.fbhDefault.verlegeabstandMm;
    standardMasse.push(`Verlegeabstand ${fmt(va, 0)} mm (Standardwert)`);
  }
  let rlb = e.rlb;
  let rlbText: string;
  if (rlb !== undefined && rlb >= 0) rlbText = `Rλ,B ${fmt(rlb, 2)}`;
  else if (e.belag) {
    rlb = f.rlbTypisch[e.belag];
    rlbText = `Belag ${e.belag} (Rλ,B ${fmt(rlb, 2)})`;
  } else {
    rlb = raumTyp === 'bad' || raumTyp === 'dusche' ? a.fbhDefault.rlbBad : a.fbhDefault.rlb;
    rlbText = `Rλ,B ${fmt(rlb, 2)}`;
    standardMasse.push(`Belag Rλ,B ${fmt(rlb, 2)} m²K/W (Standardwert)`);
  }
  const rlbMax = Number(f.rlbStufen[f.rlbStufen.length - 1]);
  const rlbEff = Math.min(Math.max(rlb, 0), rlbMax);
  if (rlb > rlbMax) hinweise.push(h('warnung', 'waermeabgabe.fbh.rlb', `Belag Rλ,B ${fmt(rlb, 2)} über EN-1264-Grenze ${fmt(rlbMax, 2)} — gerechnet mit ${fmt(rlbMax, 2)}.`, pfad('rlb')));
  const gruppen: Gruppe[] = f.rlbStufen.map((s) => ({
    x: Number(s),
    punkte: f.verlegeabstandMm.map((v, idx) => ({ x: v, w: f.qWm2[s]?.['15']?.[idx] ?? NaN })),
  }));
  const i = interpoliere2(gruppen, rlbEff, va);
  if (!i) return null;
  const q15 = i.w;
  const q3528 = q15 * leistungsfaktor(35, 28, 20, daten.exponenten.werte.fbh ?? 1.1, { tVL: 40, tRL: 30, tInt: 20 });
  return {
    wert: q3528 * e.flaecheM2,
    stufe: 'bauartMasse',
    begruendung: `FBH Nassestrich VA ${fmt(va, 0)} mm, ${rlbText}: ${fmt(q15, 0)} W/m² bei ΔθH 15 K → ${fmt(q3528, 1)} W/m² bei 35/28/20 × ${fmt(e.flaecheM2, 1)} m²`,
    quelle: quellenText(f.quelle, daten),
    extrapoliert: i.extrapoliert,
    standardMasse,
    bezug: BEZUG_FLAECHE,
    qMaxW: f.grenzwerte.qMaxAufenthaltWm2 * e.flaecheM2,
    hinweise,
  };
}

function plattenTiefePlausi(e: HeizflaecheEingabe, daten: HkDaten, hinweise: Hinweis[]): void {
  if (!(e.tiefeMm && e.tiefeMm > 0)) return;
  const eigen = bauartDaten(e.bauart, daten)?.tiefeTypMm;
  if (!eigen || eigen.length < 2) return;
  const [lo, hi] = [eigen[0]!, eigen[eigen.length - 1]!];
  if (e.tiefeMm >= lo - 10 && e.tiefeMm <= hi + 10) return;
  const passend = PLATTEN_REIHENFOLGE.filter((b) => {
    const t = bauartDaten(b, daten)?.tiefeTypMm;
    return t && t.length >= 2 && e.tiefeMm! >= t[0]! - 10 && e.tiefeMm! <= t[t.length - 1]! + 10;
  });
  const vorschlag = passend.length ? ` Passt eher zu ${passend.map((b) => 'Typ ' + b.replace('platte_', '')).join(' / ')}.` : '';
  hinweise.push(h('warnung', 'waermeabgabe.platte.tiefe', `Bautiefe ${fmt(e.tiefeMm, 0)} mm passt nicht zu Typ ${e.bauart.replace('platte_', '')} (${fmt(lo, 0)}–${fmt(hi, 0)} mm).${vorschlag}`, `waermeabgabe.heizflaechen.${e.id}.bauart`));
}

/** Normleistung aus der Modell-DB (Datenblatt). */
function qnAusModell(e: HeizflaecheEingabe, m: HkModell, daten: HkDaten): QnRoh | null {
  const hinweise: Hinweis[] = [];
  const tol = daten.auslegung.hoeheEinrastenToleranzMm;
  const q = `${quellenText(m.quelle, daten)}${m.quelleSeite ? ', ' + m.quelleSeite : ''}`;
  const name = `${m.hersteller} ${m.modellreihe}`;
  const basis = { stufe: 'modell' as const, quelle: q, standardMasse: [] as string[], bezug: BEZUG_RADIATOR, hinweise };
  if (m.bauart !== e.bauart) hinweise.push(h('warnung', 'waermeabgabe.modell.bauart', `Modell ${name} hat Bauart ${m.bauart}, erfasst ist ${e.bauart} — gerechnet mit dem Modell.`, `waermeabgabe.heizflaechen.${e.id}.modellId`));
  const nModell = typeof m.n === 'number' ? m.n : undefined;
  const mitN = <T extends object>(o: T): T & { nModell?: number } => (nModell !== undefined ? { ...o, nModell } : o);
  if (m.wProM7565 !== undefined) {
    if (!(e.laengeMm && e.laengeMm > 0)) return null;
    if (m.hoeheMm && e.hoeheMm && Math.abs(m.hoeheMm - e.hoeheMm) > tol) {
      hinweise.push(h('warnung', 'waermeabgabe.modell.hoehe', `Erfasste Höhe ${fmt(e.hoeheMm, 0)} mm weicht vom Modell (H ${fmt(m.hoeheMm, 0)} mm) ab.`, `waermeabgabe.heizflaechen.${e.id}.hoeheMm`));
    }
    return mitN({ ...basis, wert: (m.wProM7565 * e.laengeMm) / 1000, extrapoliert: false, begruendung: `${name} H ${fmt(m.hoeheMm ?? 0, 0)}: ${fmt(m.wProM7565, 0)} W/m × ${fmt(e.laengeMm / 1000, 3)} m (Datenblatt)` });
  }
  if (m.wProElement7565JeHoehe) {
    if (!(e.hoeheMm && e.hoeheMm > 0)) return null;
    const breite = m.gliedbreiteMm ?? 46;
    const anzahl = e.glieder && e.glieder > 0 ? Math.round(e.glieder) : gliederAusLaenge(e.laengeMm, breite, 26);
    if (anzahl === null) return null;
    const i = interpoliere1(Object.entries(m.wProElement7565JeHoehe).map(([x, w]) => ({ x: Number(x), w })), e.hoeheMm);
    if (!i) return null;
    return mitN({ ...basis, wert: i.w * anzahl, extrapoliert: i.extrapoliert, begruendung: `${name} H ${fmt(e.hoeheMm, 0)}: ${fmt(i.w, 1)} W/Glied × ${anzahl} Glieder (Datenblatt)` });
  }
  if (m.wProMBreite7565) {
    if (!(e.hoeheMm && e.hoeheMm > 0) || !(e.laengeMm && e.laengeMm > 0)) return null;
    const i = interpoliere1(Object.entries(m.wProMBreite7565).map(([x, w]) => ({ x: Number(x), w })), e.hoeheMm);
    if (!i) return null;
    return mitN({ ...basis, wert: (i.w * e.laengeMm) / 1000, extrapoliert: i.extrapoliert, begruendung: `${name} H ${fmt(e.hoeheMm, 0)}: ${fmt(i.w, 0)} W/m Baubreite × ${fmt(e.laengeMm / 1000, 3)} m (Datenblatt)` });
  }
  // Höhe × Breite (Bad, Vertikal): flache «HxB»-Schlüssel oder verschachtelt
  const punkte: { h: number; b: number; w: number }[] = [];
  if (m.wJeHoeheBreite7565) {
    for (const [k, v] of Object.entries(m.wJeHoeheBreite7565)) {
      if (typeof v === 'number') {
        const [hh, bb] = k.split('x').map(Number);
        if (hh && bb) punkte.push({ h: hh, b: bb, w: v });
      } else for (const [bb, w] of Object.entries(v as Record<string, number>)) punkte.push({ h: Number(k), b: Number(bb), w });
    }
  } else if (m.wJeBreiteHoehe7565) {
    for (const [bb, je] of Object.entries(m.wJeBreiteHoehe7565)) for (const [hh, w] of Object.entries(je)) punkte.push({ h: Number(hh), b: Number(bb), w });
  }
  if (!punkte.length || !(e.hoeheMm && e.hoeheMm > 0) || !(e.laengeMm && e.laengeMm > 0)) return null;
  const i = interpoliere2(gruppiere(punkte, (p) => p.h, (p) => p.b, (p) => p.w), e.hoeheMm, e.laengeMm);
  if (!i) return null;
  return mitN({ ...basis, wert: i.w, extrapoliert: i.extrapoliert, begruendung: `${name} ${fmt(e.hoeheMm, 0)} × ${fmt(e.laengeMm, 0)} mm: ${fmt(i.w, 0)} W (Datenblatt, interpoliert)` });
}

/** Exponent aus EINER Tabelle (exponenten.werte); Modell/Typenschild/Override gewinnen. */
function exponent(e: HeizflaecheEingabe, nModell: number | undefined, daten: HkDaten): Wert {
  if (e.nOverride && e.nOverride > 0) return override(e.nOverride, '-', `Exponent n manuell ${fmt(e.nOverride, 2)}`);
  if (e.typenschild?.n && e.typenschild.n > 0) return eingabe(e.typenschild.n, '-', `Exponent n ${fmt(e.typenschild.n, 2)} laut Typenschild/Datenblatt`);
  if (nModell !== undefined) return tabelle(nModell, '-', `Exponent n ${fmt(nModell, 2)} laut Modell-Datenblatt`, 'heizkoerper-tabellen.json modelle[]', { stufe: 'modell' });
  const n = daten.exponenten.werte[e.bauart] ?? 1.3;
  const label = bauartDaten(e.bauart, daten)?.label ?? e.bauart;
  return tabelle(n, '-', `Exponent n ${fmt(n, 2)} für ${label} (eine Exponenten-Tabelle)`, quellenText(daten.exponenten.quelle, daten), { stufe: 'bauart' });
}

/** Löst eine Heizfläche auf: Q_N mit Herkunft, Bezug, n. Heizkurven-Stufe wird im Raum ergänzt. */
export function normleistung(e: HeizflaecheEingabe, daten: HkDaten, o: { raumId?: string; raumTyp?: string | undefined } = {}): Aufgeloest {
  const kat = kategorieVon(e.bauart, daten);
  const label = bauartDaten(e.bauart, daten)?.label ?? e.bauart;
  const u = daten.auslegung.unsicherheitProzent;
  const hinweise: Hinweis[] = [];
  let roh: QnRoh | null = null;

  if (e.typenschild && kat !== 'flaeche') {
    const t = e.typenschild;
    const nT = exponent(e, undefined, daten).wert;
    const d = dTlog(t.tVLC, t.tRLC, t.tRaumC);
    if (t.qNW > 0 && d > 0) {
      const f = (dTlog(75, 65, 20) / d) ** nT;
      const istNorm = Math.abs(t.tVLC - 75) < 0.01 && Math.abs(t.tRLC - 65) < 0.01 && Math.abs(t.tRaumC - 20) < 0.01;
      roh = {
        wert: t.qNW * f,
        stufe: 'typenschild',
        begruendung: istNorm
          ? `Typenschild ${fmt(t.qNW, 0)} W bei 75/65/20`
          : `Typenschild ${fmt(t.qNW, 0)} W bei ${fmt(t.tVLC, 0)}/${fmt(t.tRLC, 0)}/${fmt(t.tRaumC, 0)} × (49.83/${fmt(d, 2)})^${fmt(nT, 2)} = ${fmt(f, 3)} → 75/65/20`,
        quelle: `Typenschild/Datenblatt (Eingabe); Umrechnung ${Q_EN442}`,
        extrapoliert: false,
        standardMasse: [],
        bezug: BEZUG_RADIATOR,
        hinweise: [],
      };
    } else hinweise.push(h('fehler', 'waermeabgabe.typenschild.ungueltig', 'Typenschild: Leistung oder Bezugstemperaturen ungültig (θ_RL muss über θ_Raum liegen).', `waermeabgabe.heizflaechen.${e.id}.typenschild`));
  }
  if (!roh && e.modellId && kat !== 'flaeche') {
    const m = daten.modelle.find((x) => x.id === e.modellId);
    if (!m) hinweise.push(h('warnung', 'waermeabgabe.modell.unbekannt', `Modell «${e.modellId}» nicht in der Modell-DB — gerechnet aus Bauart und Massen.`, `waermeabgabe.heizflaechen.${e.id}.modellId`));
    else roh = qnAusModell(e, m, daten);
  }
  if (!roh) roh = qnAusMassen(e, o.raumTyp, daten);
  if (!roh && e.bauart === 'konvektor_geblaese') {
    hinweise.push(h('fehler', 'waermeabgabe.geblaese.typenschild', 'Gebläsekonvektor: Leistung nur über Typenschild oder Datenblatt (keine Tabelle nach Massen).', `waermeabgabe.heizflaechen.${e.id}.typenschild`));
  }

  let qN: Wert | null = null;
  let stufe: QnStufe = 'fehlt';
  let bezug = kat === 'flaeche' ? BEZUG_FLAECHE : BEZUG_RADIATOR;
  let nModell: number | undefined;
  let qMaxW: number | undefined;
  if (roh) {
    hinweise.push(...roh.hinweise);
    stufe = roh.stufe;
    bezug = roh.bezug;
    nModell = roh.nModell;
    qMaxW = roh.qMaxW;
    const basisU = roh.stufe === 'typenschild' ? u.typenschild : roh.stufe === 'modell' ? u.modell : u.tabelle;
    const teile = [basisU, roh.extrapoliert ? u.extrapoliert : 0, roh.standardMasse.length ? u.standardMass : 0].filter((x) => x > 0);
    const unsicherheit = Math.round(Math.sqrt(teile.reduce((s, x) => s + x * x, 0)) * 10) / 10;
    const zusatz = roh.standardMasse.length ? `; ${roh.standardMasse.join(', ')}` : '';
    const bezugText = bezug === BEZUG_FLAECHE ? '35/28/20' : '75/65/20';
    const text = `Q_N ${bezugText} = ${fmt(roh.wert, 0)} W: ${roh.begruendung}${zusatz} (±${fmt(unsicherheit, 0)} %)`;
    if (roh.stufe === 'typenschild') {
      qN = berechnet(roh.wert, 'W', text, [], { stufe: 'typenschild', unsicherheit, quelle: roh.quelle });
    } else if (roh.standardMasse.length) {
      qN = fallback(roh.wert, 'W', text, { stufe: 'standardwert', unsicherheit, quelle: roh.quelle });
    } else {
      qN = tabelle(roh.wert, 'W', text, roh.quelle, { stufe: roh.stufe, unsicherheit });
    }
  }
  const r: Aufgeloest = { e, raumId: o.raumId ?? '', bauart: e.bauart, label, kat, qN, stufe, bezug, n: exponent(e, nModell, daten), hinweise };
  if (qMaxW !== undefined) r.qMaxW = qMaxW;
  return r;
}

/* ---------------------------------------------------------------------------------------------- */
/* Minderungen, Leistung bei Betriebstemperaturen                                                 */
/* ---------------------------------------------------------------------------------------------- */

function stufeInterpoliert(stufen: ReadonlyArray<{ x: number; w: number }>, x: number): number {
  const s = [...stufen].sort((a, b) => a.x - b.x);
  if (!s.length) return 0;
  if (x <= s[0]!.x) return s[0]!.w;
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1]!;
    const b = s[i]!;
    if (x <= b.x) return a.w + ((b.w - a.w) * (x - a.x)) / (b.x - a.x);
  }
  return s[s.length - 1]!.w;
}

/** f_m = f1·f2·f3·f4·f5 (B2 S.242, Wissensbasis E §10.3). Ohne Angaben: 1 (frei aufgestellt, Normbedingung). */
export function minderungsfaktor(a: Pick<Aufgeloest, 'e' | 'kat' | 'bauart'>, spreizungK: number, daten: HkDaten): Wert {
  const m = a.e.minderungen;
  if (!m || a.kat === 'flaeche') return berechnet(1, '-', 'keine Minderungen angegeben (frei aufgestellt, Normbedingung EN 442)');
  const d = daten.minderungen;
  const teile: string[] = [];
  let fm = 1;
  let typisch = false;
  const anwenden = (v: boolean | number | undefined, typ: number, name: string) => {
    if (v === undefined || v === false) return;
    const proz = typeof v === 'number' ? v : typ;
    if (typeof v !== 'number') typisch = true;
    fm *= 1 - proz / 100;
    teile.push(`${name} −${fmt(proz, 1)} %${typeof v === 'number' ? '' : ' (typisch)'}`);
  };
  anwenden(m.nische, d.f1Nische.mProzentTyp, 'f1 Nische');
  const f2Key =
    a.kat === 'glieder' || a.kat === 'roehren'
      ? 'glieder'
      : a.bauart === 'platte_10'
        ? 'platteEinreihigOhneKonvektorblech'
        : a.bauart === 'platte_11'
          ? 'platteEinreihigMitKonvektorblech'
          : a.kat === 'platte'
            ? 'platteMehrreihig'
            : null;
  const f2Spanne = f2Key ? d.f2Verkleidung.mProzent[f2Key] : undefined;
  const f2Typ = f2Spanne && f2Spanne.length >= 2 ? (f2Spanne[0]! + f2Spanne[1]!) / 2 : d.f2Verkleidung.mProzentTyp;
  anwenden(m.verkleidung, f2Typ, 'f2 Verkleidung');
  anwenden(m.oberflaeche, d.f3Oberflaeche.mProzentTyp, 'f3 Oberfläche');
  if (m.anschluss === 'reitend') {
    const laenge = a.e.laengeMm ?? 0;
    const f4 = d.f4Baulaenge.stufen.find((s) => laenge <= s.bisMm)?.mProzent ?? d.f4Baulaenge.stufen[d.f4Baulaenge.stufen.length - 1]?.mProzent ?? 0;
    const f5 = stufeInterpoliert(d.f5Anschluss.stufen.map((s) => ({ x: s.spreizungK, w: s.reitend })), spreizungK);
    if (f4 > 0) {
      fm *= 1 - f4 / 100;
      teile.push(`f4 Baulänge −${fmt(f4, 1)} %`);
    }
    fm *= 1 - f5 / 100;
    teile.push(`f5 Anschluss reitend bei ${fmt(spreizungK, 0)} K −${fmt(f5, 1)} %`);
  } else if (m.anschluss === 'wechselseitig') {
    const f5 = stufeInterpoliert(d.f5Anschluss.stufen.map((s) => ({ x: s.spreizungK, w: s.wechselseitig })), spreizungK);
    if (f5 > 0) {
      fm *= 1 - f5 / 100;
      teile.push(`f5 Anschluss wechselseitig −${fmt(f5, 1)} %`);
    }
  }
  if (!teile.length) return berechnet(1, '-', 'keine Minderungen (frei aufgestellt, Normbedingung EN 442)');
  const text = `f_m = ${fmt(fm, 3)}: ${teile.join(', ')}`;
  return typisch ? tabelle(fm, '-', text, quellenText(d.quelle, daten), { stufe: 'minderung' }) : berechnet(fm, '-', text);
}

/** Leistung einer aufgelösten Heizfläche bei Betriebstemperaturen [W]. */
function leistung(a: Aufgeloest, fm: number, tVL: number, tRL: number, tInt: number): number {
  if (!a.qN) return 0;
  const f = leistungsfaktor(tVL, tRL, tInt, a.n.wert, a.bezug);
  let q = a.qN.wert * fm * f;
  if (a.qMaxW !== undefined) q = Math.min(q, a.qMaxW);
  return q;
}

/* ---------------------------------------------------------------------------------------------- */
/* Raum                                                                                            */
/* ---------------------------------------------------------------------------------------------- */

interface Betrieb {
  a: Aufgeloest;
  fm: Wert;
  spreizung: Wert;
  vlZiel: Wert;
  /** Mischer-Obergrenze (gemischter Kreis). */
  vlMax?: number;
}

function ampelDeckung(d: number, daten: HkDaten): Ampel {
  if (d >= daten.ampel.deckung.gruenAb) return 'gruen';
  if (d >= daten.ampel.deckung.gelbAb) return 'gelb';
  return 'rot';
}

export function ampelVorlauf(tVL: number | null, daten: HkDaten): Ampel {
  if (tVL === null) return 'rot';
  if (tVL <= daten.ampel.vorlaufC.gutBis + 1e-9) return 'gruen';
  if (tVL <= daten.ampel.vorlaufC.kritischBis + 1e-9) return 'gelb';
  return 'rot';
}

function summeBei(b: ReadonlyArray<Betrieb>, theta: number, tInt: number): number {
  let s = 0;
  for (const x of b) {
    const vl = x.vlMax !== undefined ? Math.min(theta, x.vlMax) : theta;
    s += leistung(x.a, x.fm.wert, vl, vl - x.spreizung.wert, tInt);
  }
  return s;
}

function tVLReqFuer(b: ReadonlyArray<Betrieb>, phi: number, tInt: number, daten: HkDaten): number | null {
  const [lo, hi] = [daten.auslegung.vlSuchbereichC[0] ?? 20, daten.auslegung.vlSuchbereichC[1] ?? 90];
  return bisektionVorlauf((t) => summeBei(b, t, tInt), phi, Math.min(lo, tInt), hi);
}

/** Massnahmen für einen Raum mit Deckung < 1 (Wissensbasis E §3.10; befund_heizkoerper.md §6.2 Punkt 6). */
function massnahmenFuerRaum(b: Betrieb[], phi: number, tInt: number, tVLReq: number | null, raumFlaecheM2: number | undefined, zielVL: number, raumTyp: string | undefined, daten: HkDaten): Massnahme[] {
  const out: Massnahme[] = [];
  const qZiel = (x: Betrieb) => leistung(x.a, x.fm.wert, zielVL, zielVL - x.spreizung.wert, tInt);
  const summeZiel = b.reduce((s, x) => s + qZiel(x), 0);
  const fehlend = Math.max(0, phi - summeZiel);
  const vlMax = daten.auslegung.vlSuchbereichC[1] ?? 90;
  const vlText = (t: number | null) => (t === null ? `über ${fmt(vlMax, 0)} °C` : `${fmt(t, 0)} °C`);

  // (a) Typ-Upgrade gleiche Nische (Platten mit Höhe und Länge)
  for (const x of b) {
    if (x.a.kat !== 'platte' || !(x.a.e.hoeheMm && x.a.e.laengeMm)) continue;
    const typAlt = x.a.bauart.replace('platte_', '');
    const wAlt = interpoliere1(Object.entries(daten.platten.wProM7565[typAlt] ?? {}).map(([hh, w]) => ({ x: Number(hh), w })), x.a.e.hoeheMm)?.w ?? 0;
    const kandidaten = PLATTEN_REIHENFOLGE.map((bt) => ({ bt, w: interpoliere1(Object.entries(daten.platten.wProM7565[bt.replace('platte_', '')] ?? {}).map(([hh, w]) => ({ x: Number(hh), w })), x.a.e.hoeheMm!)?.w ?? 0 }))
      .filter((k) => k.w > wAlt * 1.001)
      .sort((p, q) => p.w - q.w);
    const ergebnisse: Massnahme[] = [];
    for (const k of kandidaten) {
      const neuEingabe: HeizflaecheEingabe = { id: x.a.e.id, bauart: k.bt, hoeheMm: x.a.e.hoeheMm, laengeMm: x.a.e.laengeMm };
      if (x.a.e.minderungen) neuEingabe.minderungen = x.a.e.minderungen;
      const a2 = normleistung(neuEingabe, daten, { raumId: x.a.raumId });
      const b2 = b.map((y) => (y === x ? { ...y, a: a2 } : y));
      const t2 = tVLReqFuer(b2, phi, tInt, daten);
      ergebnisse.push({
        art: 'typUpgrade',
        heizflaecheId: x.a.e.id,
        nachBauart: k.bt,
        tVLReqNeu: t2,
        text: `Tausch ${x.a.e.bezeichnung ?? 'Typ ' + typAlt} ${fmt(x.a.e.hoeheMm, 0)}×${fmt(x.a.e.laengeMm, 0)} auf Typ ${k.bt.replace('platte_', '')} gleicher Grösse → θ_VL,req ${vlText(t2)}`,
      });
    }
    out.push(...ergebnisse);
  }

  if (fehlend > 0) {
    // (b) nötige Länge / Gliederzahl der stärksten Heizfläche bei Ziel-VL
    const haupt = [...b].filter((x) => x.a.qN).sort((p, q) => qZiel(q) - qZiel(p))[0];
    if (haupt) {
      const qH = qZiel(haupt);
      const bedarfH = phi - (summeZiel - qH);
      const k = haupt.a.kat;
      if (qH > 0 && (k === 'glieder' || k === 'roehren')) {
        const gl = haupt.a.e.glieder ?? gliederAusLaenge(haupt.a.e.laengeMm, haupt.a.e.gliedbreiteMm ?? (k === 'roehren' ? daten.roehren.charleston.gliedbreiteMm : daten.glieder.guss.gliedbreiteMm), k === 'roehren' ? 26 : 0);
        if (gl) {
          const noetig = Math.ceil((gl * bedarfH) / qH);
          out.push({ art: 'glieder', heizflaecheId: haupt.a.e.id, bedarf: noetig, einheit: 'Glieder', text: `Für ${fmt(zielVL, 0)} °C: ${noetig} statt ${gl} Glieder (gleiche Bauart und Höhe)` });
        }
      } else if (qH > 0 && haupt.a.e.laengeMm && (k === 'platte' || k === 'konvektor' || k === 'vertikal')) {
        const noetig = Math.ceil(((haupt.a.e.laengeMm * bedarfH) / qH) / 100) * 100;
        out.push({ art: 'laenge', heizflaecheId: haupt.a.e.id, bedarf: noetig, einheit: 'mm', text: `Für ${fmt(zielVL, 0)} °C: Baulänge ${fmt(noetig, 0)} mm statt ${fmt(haupt.a.e.laengeMm, 0)} mm (gleiche Bauart und Höhe)` });
        if (k === 'platte' && haupt.a.bauart !== 'platte_33' && haupt.a.e.hoeheMm) {
          const a33 = normleistung({ id: haupt.a.e.id, bauart: 'platte_33', hoeheMm: haupt.a.e.hoeheMm, laengeMm: 1000 }, daten);
          const q33 = leistung(a33, haupt.fm.wert, zielVL, zielVL - haupt.spreizung.wert, tInt);
          if (q33 > 0) {
            const l33 = Math.ceil(((1000 * bedarfH) / q33) / 100) * 100;
            out.push({ art: 'laenge', heizflaecheId: haupt.a.e.id, nachBauart: 'platte_33', bedarf: l33, einheit: 'mm', text: `Für ${fmt(zielVL, 0)} °C: Typ 33 H ${fmt(haupt.a.e.hoeheMm, 0)} mit ${fmt(l33, 0)} mm Baulänge` });
          }
        }
      }
    }
    // (c) FBH als Ersatz: Auslegung 35/28 °C (Standardsystem, Oberflächengrenze), WP fährt dafür tief — nur, wenn der Raum noch keine Flächenheizung hat
    const fbh = normleistung({ id: '_fbh', bauart: 'fbh', flaecheM2: 1 }, daten, { raumTyp });
    const bz = BEZUG_FLAECHE;
    const qFbh = fbh.qN ? leistung(fbh, 1, bz.tVL, bz.tRL, tInt) : 0;
    const hatFlaechenheizung = b.some((x) => x.a.kat === 'flaeche');
    if (qFbh > 0 && !hatFlaechenheizung) {
      const aNoetig = phi / qFbh;
      const passt = raumFlaecheM2 ? aNoetig <= raumFlaecheM2 * 0.8 : null;
      out.push({
        art: 'fbh',
        bedarf: Math.round(aNoetig * 10) / 10,
        einheit: 'm²',
        text: `FBH statt Heizkörper (VA ${fmt(daten.auslegung.fbhDefault.verlegeabstandMm, 0)} mm, Auslegung ${fmt(bz.tVL, 0)}/${fmt(bz.tRL, 0)} °C): ${fmt(qFbh, 0)} W/m² → ${fmt(aNoetig, 1)} m² belegte Fläche${raumFlaecheM2 ? ` (Raum ${fmt(raumFlaecheM2, 1)} m²${passt ? '' : ' — reicht allein nicht, Kombination mit Heizkörper'})` : ''}`,
      });
    }
    // (d) Gebläsekonvektor für die fehlende Leistung
    const nG = daten.exponenten.werte.konvektor_geblaese ?? 1.1;
    const fG = leistungsfaktor(zielVL, zielVL - daten.auslegung.spreizungDefaultK.radiator, tInt, nG);
    if (fG > 0) {
      const qNG = fehlend / fG;
      out.push({ art: 'geblaesekonvektor', bedarf: Math.ceil(qNG / 10) * 10, einheit: 'W', text: `Gebläsekonvektor für die fehlenden ${fmt(fehlend, 0)} W: Q_N 75/65 ≈ ${fmt(Math.ceil(qNG / 10) * 10, 0)} W (n ${fmt(nG, 2)})` });
    }
    // (e) Hybrid / höhere VL
    out.push({ art: 'hybrid', tVLReqNeu: tVLReq, text: `Vorlauf halten: Raum braucht ${vlText(tVLReq)} — Hochtemperatur-WP oder Hybrid (Spitzenlast fossil) ohne Heizkörpertausch` });
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------- */
/* Hauptfunktion                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

function dedupe(werte: Wert<unknown>[]): Wert<unknown>[] {
  const seen = new Set<string>();
  const out: Wert<unknown>[] = [];
  for (const w of werte) {
    const k = `${w.herkunft}|${w.begruendung}|${String(w.wert)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out;
}

export function waermeabgabe(e: WaermeabgabeEingabe, daten: WaermeabgabeDaten): WaermeabgabeErgebnis {
  const hk = daten.hk;
  const a = hk.auslegung;
  const hinweise: Hinweis[] = [];
  const annahmenRoh: Wert<unknown>[] = [];
  const kreise = new Map((e.heizkreise ?? []).map((k) => [k.id, k]));
  const vlMax = a.vlSuchbereichC[1] ?? 90;

  const zielGebaeude: Wert = e.zielVLC !== undefined ? eingabe(e.zielVLC, '°C', `Ziel-Vorlauf ${fmt(e.zielVLC, 0)} °C`) : fallback(a.zielVLDefaultC, '°C', `Ziel-Vorlauf ${fmt(a.zielVLDefaultC, 0)} °C (Grenze «gut» der WP-Tauglichkeit)`, { stufe: 'standardwert', quelle: quellenText(a.quelle, hk) });
  annahmenRoh.push(zielGebaeude);

  // Φ_HL-Verteilung (FWS-Modus)
  const verteilung = e.verteilung;
  const faktorNwf = daten.fws.ebf.faktorNwfZuEbf.typ;
  const summeFlaeche = e.raeume.filter((r) => r.beheizt !== false && r.flaecheM2 && r.flaecheM2 > 0).reduce((s, r) => s + (r.flaecheM2 ?? 0), 0);
  if (verteilung && !verteilung.ebfM2) {
    hinweise.push(h('info', 'waermeabgabe.verteilung.anteil', 'Gebäude-Heizlast nach Anteil der erfassten Raumflächen verteilt — stimmt nur, wenn alle beheizten Räume erfasst sind (sonst EBF angeben).', 'gebaeude.ebf'));
  }

  const raeume: RaumWaermeabgabe[] = [];
  for (const r of e.raeume) {
    const rh: Hinweis[] = [];
    const beheizt = r.beheizt !== false;
    // θ_int
    let thetaInt: Wert;
    if (r.thetaInt) thetaInt = r.thetaInt;
    else if (r.thetaIntC !== undefined) thetaInt = eingabe(r.thetaIntC, '°C', `Raumtemperatur ${fmt(r.thetaIntC, 0)} °C`);
    else {
      const t = r.typ ? daten.sia.innentemperaturen.raumtypen.find((x) => x.key === r.typ) : undefined;
      const std = daten.sia.innentemperaturen.raumtypen.find((x) => x.key === 'wohnen')?.thetaIntC ?? 20;
      thetaInt = t
        ? tabelle(t.thetaIntC, '°C', `Raumtemperatur ${fmt(t.thetaIntC, 0)} °C (${t.label})`, 'sia384-2.json innentemperaturen', { stufe: 'raumtyp' })
        : fallback(std, '°C', `Raumtemperatur ${fmt(std, 0)} °C (Wohnraum, Standardwert)`, { stufe: 'standardwert', quelle: 'sia384-2.json innentemperaturen' });
      annahmenRoh.push(thetaInt);
    }
    // Φ_HL
    let phiHL: Wert | null = null;
    if (r.phiHL) phiHL = r.phiHL;
    else if (r.phiHLManuellW !== undefined) phiHL = eingabe(r.phiHLManuellW, 'W', `Raumheizlast ${fmt(r.phiHLManuellW, 0)} W manuell`);
    else if (verteilung && beheizt && r.flaecheM2 && r.flaecheM2 > 0) {
      const qhl = verteilung.qhl.wert;
      const uV = Math.round(Math.sqrt(a.unsicherheitProzent.verteilungNachFlaeche ** 2 + (verteilung.qhl.unsicherheit ?? 0) ** 2) * 10) / 10;
      if (verteilung.ebfM2 && verteilung.ebfM2 > 0) {
        const wert = (qhl / verteilung.ebfM2) * faktorNwf * r.flaecheM2;
        phiHL = schaetzung(wert, 'W', `Φ_HL ≈ Q_hl ${fmt(qhl, 0)} W / EBF ${fmt(verteilung.ebfM2, 1)} m² × ${fmt(faktorNwf, 2)} (NWF→EBF) × ${fmt(r.flaecheM2, 1)} m² = ${fmt(wert, 0)} W (nach Raumfläche verteilt)`, { stufe: 'verteilung', unsicherheit: uV, quelle: 'FWS M3 Folie 33 (EBF ≈ NWF × 1.10); Thermowerk-Annahme gleichmässige W/m²' });
      } else if (summeFlaeche > 0) {
        const wert = (qhl * r.flaecheM2) / summeFlaeche;
        phiHL = schaetzung(wert, 'W', `Φ_HL ≈ Q_hl ${fmt(qhl, 0)} W × ${fmt(r.flaecheM2, 1)} / ${fmt(summeFlaeche, 1)} m² = ${fmt(wert, 0)} W (Anteil der erfassten Raumflächen)`, { stufe: 'verteilung', unsicherheit: uV, quelle: 'Thermowerk-Annahme gleichmässige W/m²' });
      }
      if (phiHL) annahmenRoh.push(phiHL);
    }
    if (!phiHL && beheizt && r.heizflaechen.length) rh.push(h('warnung', 'waermeabgabe.raum.ohneHeizlast', `${r.name}: keine Raumheizlast — Heizflächen können nicht beurteilt werden.`, `raeume.${r.id}`));

    // Heizflächen auflösen
    const aufg = r.heizflaechen.map((hf) => normleistung(hf, hk, { raumId: r.id, raumTyp: r.typ }));
    // Fallback-Stufe alte Heizkurve: unbekannte Masse → Mindest-Q_N, sodass der Raum bei θ_VL,alt gedeckt war
    const unbekannt = aufg.filter((x) => !x.qN && !x.hinweise.some((hh) => hh.stufe === 'fehler'));
    if (unbekannt.length && e.heizkurveAlt && phiHL && phiHL.wert > 0) {
      const tVLa = e.heizkurveAlt.tVLC;
      const spreizA = e.heizkurveAlt.tRLC !== undefined ? tVLa - e.heizkurveAlt.tRLC : a.spreizungDefaultK.radiator;
      const tRLa = tVLa - spreizA;
      const bekanntAlt = aufg.filter((x) => x.qN).reduce((s, x) => s + leistung(x, 1, tVLa, tRLa, thetaInt.wert), 0);
      const rest = Math.max(0, phiHL.wert - bekanntAlt);
      for (const x of unbekannt) {
        const f = leistungsfaktor(tVLa, tRLa, thetaInt.wert, x.n.wert, x.bezug);
        if (!(f > 0)) continue;
        const wert = rest / unbekannt.length / f;
        x.qN = schaetzung(wert, 'W', `Mindest-Q_N ${x.bezug === BEZUG_FLAECHE ? '35/28/20' : '75/65/20'} = ${fmt(wert, 0)} W: Raum war mit alter Heizkurve ${fmt(tVLa, 0)}/${fmt(tRLa, 0)} °C gedeckt (Φ_HL ${fmt(rest / unbekannt.length, 0)} W / f ${fmt(f, 3)}); Masse unbekannt — echte Leistung eher höher (±${fmt(a.unsicherheitProzent.heizkurve, 0)} %)`, { stufe: 'heizkurve', unsicherheit: a.unsicherheitProzent.heizkurve, quelle: 'Alte Heizkurve (Eingabe); FWS M3 Aufgaben S. 19 «Heizkurve Heizkörper»; befund_heizkoerper.md HK-23' });
        x.stufe = 'heizkurve';
        x.hinweise.push(h('info', 'waermeabgabe.heizkurve.mindest', `${x.e.bezeichnung ?? x.label}: Normleistung aus alter Heizkurve geschätzt (Mindestwert) — nötige VL ist damit eine obere Schranke.`, `waermeabgabe.heizflaechen.${x.e.id}`));
      }
    }
    for (const x of aufg) {
      if (!x.qN && !x.hinweise.some((hh) => hh.stufe === 'fehler')) {
        x.hinweise.push(h('fehler', 'waermeabgabe.masse.fehlen', `${x.e.bezeichnung ?? x.label}: Masse fehlen (${relevanteMasse(x.bauart, hk).join(', ')}) — keine Normleistung.`, `waermeabgabe.heizflaechen.${x.e.id}`));
      }
    }

    // Betrieb je Heizfläche: Kreis, Spreizung, Ziel-VL, f_m
    const betrieb: Betrieb[] = aufg.map((x) => {
      const k = x.e.kreisId ? kreise.get(x.e.kreisId) : undefined;
      if (x.e.kreisId && !k) x.hinweise.push(h('warnung', 'waermeabgabe.kreis.unbekannt', `Heizkreis «${x.e.kreisId}» existiert nicht — Standardwerte verwendet.`, `waermeabgabe.heizflaechen.${x.e.id}.kreisId`));
      const stdSpreiz = x.kat === 'flaeche' ? a.spreizungDefaultK.flaeche : a.spreizungDefaultK.radiator;
      const spreizung = k?.spreizungK !== undefined
        ? eingabe(k.spreizungK, 'K', `Spreizung ${fmt(k.spreizungK, 0)} K (Heizkreis ${k.bezeichnung ?? k.id})`)
        : fallback(stdSpreiz, 'K', `Spreizung ${fmt(stdSpreiz, 0)} K (${x.kat === 'flaeche' ? 'Flächenheizung' : 'Radiatoren'}, Standardwert)`, { stufe: 'standardwert', quelle: quellenText(a.quelle, hk) });
      const vlZiel = k?.tVLC !== undefined ? eingabe(k.tVLC, '°C', `Vorlauf ${fmt(k.tVLC, 0)} °C (Heizkreis ${k.bezeichnung ?? k.id})`) : zielGebaeude;
      const fm = minderungsfaktor(x, spreizung.wert, hk);
      const bt: Betrieb = { a: x, fm, spreizung, vlZiel };
      if (k?.gemischt && k.tVLC !== undefined) bt.vlMax = k.tVLC;
      return bt;
    });

    const mitQ = betrieb.filter((x) => x.a.qN);
    const hfErg: HeizflaecheErgebnis[] = betrieb.map((x) => {
      const qz = x.a.qN ? leistung(x.a, x.fm.wert, x.vlZiel.wert, x.vlZiel.wert - x.spreizung.wert, thetaInt.wert) : null;
      const qZiel = qz === null || !x.a.qN
        ? null
        : berechnet(qz, 'W', `Q = ${fmt(x.a.qN.wert, 0)} W × f_m ${fmt(x.fm.wert, 3)} × (${fmt(dTlog(x.vlZiel.wert, x.vlZiel.wert - x.spreizung.wert, thetaInt.wert), 2)}/${fmt(dTlog(x.a.bezug.tVL, x.a.bezug.tRL, x.a.bezug.tInt), 2)})^${fmt(x.a.n.wert, 2)} = ${fmt(qz, 0)} W bei ${fmt(x.vlZiel.wert, 0)}/${fmt(x.vlZiel.wert - x.spreizung.wert, 0)}/${fmt(thetaInt.wert, 0)} °C${x.a.qMaxW !== undefined && qz >= x.a.qMaxW - 1e-6 ? ' (begrenzt durch max. Oberflächentemperatur)' : ''}`, [x.a.qN, x.fm]);
      if (x.a.qN) annahmenRoh.push(x.a.qN, x.a.n, x.fm, x.spreizung);
      return {
        id: x.a.e.id,
        raumId: r.id,
        bauart: x.a.bauart,
        bauartLabel: x.a.label,
        kategorie: x.a.kat,
        kreisId: x.a.e.kreisId ?? null,
        stufe: x.a.stufe,
        qN: x.a.qN,
        bezug: x.a.bezug,
        n: x.a.n,
        fm: x.fm,
        spreizung: x.spreizung,
        vlZiel: x.vlZiel,
        qZiel,
        standardwerte: standardMasse(x.a.e, r.typ, hk),
        hinweise: x.a.hinweise,
      };
    });
    for (const x of betrieb) if (x.vlZiel !== zielGebaeude) annahmenRoh.push(x.vlZiel);

    const vlZielRaum = betrieb.reduce<Wert>((m, x) => (x.vlZiel.wert > m.wert ? x.vlZiel : m), betrieb[0]?.vlZiel ?? zielGebaeude);
    let qZiel: Wert | null = null;
    let deckung: Wert | null = null;
    let ampel: Ampel = 'grau';
    let tVLReq: Wert | null = null;
    let erreichbar = true;
    let mischerGrenze: { kreisVLC: number; qBeiKreisVL: number } | null = null;
    let massnahmen: Massnahme[] = [];
    if (mitQ.length) {
      const teile = hfErg.map((x) => x.qZiel).filter((x): x is Wert => !!x);
      const s = teile.reduce((acc, x) => acc + x.wert, 0);
      const uS = unsicherheitSumme(teile);
      qZiel = berechnet(s, 'W', `Σ Q bei Ziel-VL = ${teile.map((x) => fmt(x.wert, 0)).join(' + ')} = ${fmt(s, 0)} W`, [], uS !== undefined ? { unsicherheit: uS } : undefined);
    }
    if (beheizt && phiHL && mitQ.length && qZiel) {
      if (phiHL.wert <= 0) {
        ampel = 'gruen';
        rh.push(h('info', 'waermeabgabe.raum.keineHeizlast', `${r.name}: Raumheizlast ≤ 0 W (Innengewinne) — keine Vorlauf-Anforderung.`));
      } else {
        const d = qZiel.wert / phiHL.wert;
        deckung = berechnet(d, '-', `Deckung = Σ Q ${fmt(qZiel.wert, 0)} W / Φ_HL ${fmt(phiHL.wert, 0)} W = ${fmt(d * 100, 0)} %`, [qZiel, phiHL]);
        ampel = ampelDeckung(d, hk);
        if (d >= hk.ampel.starkUeberdimensioniertAb) rh.push(h('info', 'waermeabgabe.raum.ueberdimensioniert', `${r.name}: Heizfläche deckt ${fmt(d * 100, 0)} % — Reserve für tiefere Vorlauftemperatur.`));
        let t = tVLReqFuer(mitQ, phiHL.wert, thetaInt.wert, hk);
        let rechenBasis = mitQ;
        const gedeckelt = mitQ.filter((x) => x.vlMax !== undefined);
        if (t === null && gedeckelt.length) {
          // Deckel des Mischerkreises ist die Grenze, nicht die Heizfläche: θ_VL,req ohne Deckel bestimmen (Audit S12, HK §3.1)
          const ohneDeckel: Betrieb[] = mitQ.map(({ vlMax: _v, ...x }) => x);
          const t2 = tVLReqFuer(ohneDeckel, phiHL.wert, thetaInt.wert, hk);
          if (t2 !== null) {
            const kreisVL = Math.max(...gedeckelt.map((x) => x.vlMax!));
            const qKreis = summeBei(mitQ, kreisVL, thetaInt.wert);
            mischerGrenze = { kreisVLC: kreisVL, qBeiKreisVL: qKreis };
            t = t2;
            rechenBasis = ohneDeckel;
            rh.push(h('warnung', 'waermeabgabe.raum.mischerGrenze', `${r.name}: Der gemischte Heizkreis ist auf ${fmt(kreisVL, 0)} °C begrenzt — die Heizflächen liefern dort ${fmt(qKreis, 0)} W von Φ_HL ${fmt(phiHL.wert, 0)} W. Kreis-Vorlauf auf ${fmt(t2, 0)} °C anheben oder Heizfläche vergrössern.`, `raeume.${r.id}`));
          }
        }
        erreichbar = t !== null;
        const spr = [...new Set(mitQ.map((x) => fmt(x.spreizung.wert, 0)))].join('/');
        tVLReq = t === null
          ? null
          : berechnet(t, '°C', `θ_VL,req = ${fmt(t, 1)} °C: Σ Q(θ_VL, θ_VL − ${spr} K, ${fmt(thetaInt.wert, 0)} °C) = Φ_HL ${fmt(phiHL.wert, 0)} W (Bisektion, log. Übertemperatur${mischerGrenze ? `; ohne Mischer-Grenze ${fmt(mischerGrenze.kreisVLC, 0)} °C` : ''})`, [phiHL, ...mitQ.map((x) => x.a.qN)]);
        if (!erreichbar) {
          const nurFlaeche = mitQ.every((x) => x.a.kat === 'flaeche');
          rh.push(h('warnung', 'waermeabgabe.raum.nichtErreichbar', nurFlaeche
            ? `${r.name}: Die Flächenheizung deckt Φ_HL ${fmt(phiHL.wert, 0)} W auch bei maximaler Oberflächentemperatur nicht — belegte Fläche vergrössern oder zusätzliche Heizfläche.`
            : `${r.name}: Heizflächen decken Φ_HL ${fmt(phiHL.wert, 0)} W auch bei ${fmt(vlMax, 0)} °C nicht.`, `raeume.${r.id}`));
        }
        if (d < hk.ampel.deckung.gruenAb) massnahmen = massnahmenFuerRaum(rechenBasis, phiHL.wert, thetaInt.wert, t, r.flaecheM2, vlZielRaum.wert, r.typ, hk);
      }
    } else if (beheizt && !r.heizflaechen.length) {
      rh.push(h('info', 'waermeabgabe.raum.ohneHeizflaeche', `${r.name}: keine Heizfläche erfasst.`, `raeume.${r.id}`));
    }
    for (const x of hfErg) rh.push(...x.hinweise);
    raeume.push({
      id: r.id,
      name: r.name,
      beheizt,
      ausgeklammert: !!r.ausklammern,
      thetaInt,
      phiHL,
      heizflaechen: hfErg,
      qZiel,
      vlZiel: vlZielRaum,
      deckung,
      ampel,
      tVLReq,
      erreichbar,
      mischerGrenze,
      massnahmen,
      hinweise: rh,
    });
  }

  // Gebäude
  const bewertet = raeume.filter((r) => r.beheizt && !r.ausgeklammert && r.phiHL && r.phiHL.wert > 0 && r.qZiel);
  const kritisch: KritischerRaum[] = bewertet
    .map((r) => ({ raumId: r.id, name: r.name, tVLReq: r.tVLReq?.wert ?? null }))
    .sort((p, q) => (q.tVLReq ?? Infinity) - (p.tVLReq ?? Infinity));
  const massgebend = kritisch[0] ?? null;
  let ausHf: Wert | null = null;
  if (massgebend) {
    const rr = raeume.find((r) => r.id === massgebend.raumId)!;
    const nurFlaecheMassgebend = rr.heizflaechen.length > 0 && rr.heizflaechen.every((x) => x.kategorie === 'flaeche');
    ausHf = massgebend.tVLReq === null
      ? berechnet(vlMax, '°C', nurFlaecheMassgebend
        ? `Auslegungs-VL ≥ ${fmt(vlMax, 0)} °C: Flächenheizung in ${massgebend.name} zu klein (auch bei maximaler Oberflächentemperatur nicht gedeckt)`
        : `Auslegungs-VL ≥ ${fmt(vlMax, 0)} °C: ${massgebend.name} wird auch bei ${fmt(vlMax, 0)} °C nicht gedeckt`, [], { stufe: 'heizflaechen' })
      : berechnet(massgebend.tVLReq, '°C', `Auslegungs-VL = max θ_VL,req = ${fmt(massgebend.tVLReq, 1)} °C (massgebend: ${massgebend.name}; ${bewertet.length} Räume bewertet)`, [rr.tVLReq], { stufe: 'heizflaechen' });
  } else {
    const kreisVL = (e.heizkreise ?? []).map((k) => k.tVLC).filter((t): t is number => t !== undefined);
    if (kreisVL.length) {
      const m = Math.max(...kreisVL);
      ausHf = eingabe(m, '°C', `Auslegungs-VL = höchster Heizkreis-Vorlauf ${fmt(m, 0)} °C (keine Heizflächen-Bewertung)`);
      ausHf.stufe = 'heizkreis';
    } else hinweise.push(h('info', 'waermeabgabe.gebaeude.keineBewertung', 'Keine Heizflächen mit Raumheizlast erfasst — Auslegungs-VL nicht aus Heizflächen ableitbar.'));
  }
  let auslegungsVL = ausHf;
  if (e.auslegungsVLOverrideC !== undefined) {
    auslegungsVL = override(e.auslegungsVLOverrideC, '°C', `Auslegungs-VL manuell ${fmt(e.auslegungsVLOverrideC, 0)} °C${ausHf ? ` (aus Heizflächen: ${fmt(ausHf.wert, 1)} °C)` : ''}`);
    annahmenRoh.push(auslegungsVL);
    if (ausHf && e.auslegungsVLOverrideC + 0.5 < ausHf.wert) {
      hinweise.push(h('warnung', 'waermeabgabe.gebaeude.overrideZuTief', `Manuelle Auslegungs-VL ${fmt(e.auslegungsVLOverrideC, 0)} °C liegt unter dem Bedarf der Heizflächen (${fmt(ausHf.wert, 1)} °C, ${massgebend?.name ?? ''}) — Räume werden nicht warm.`, 'waermeabgabe.auslegungsVLOverrideC'));
    } else hinweise.push(h('info', 'waermeabgabe.gebaeude.override', 'Auslegungs-VL manuell gesetzt — Gerätefilter, Ausdehnungsgefäss und Bericht verwenden diesen Wert.', 'waermeabgabe.auslegungsVLOverrideC'));
  }
  const gutBis = hk.ampel.vorlaufC.gutBis;
  const kritischBis = hk.ampel.vorlaufC.kritischBis;
  let gAmpel: Ampel = 'grau';
  let urteil = 'Keine Beurteilung: Heizflächen und Raumheizlast fehlen.';
  if (auslegungsVL) {
    const t = auslegungsVL.wert;
    const unerreichbar = !e.auslegungsVLOverrideC && massgebend?.tVLReq === null;
    gAmpel = unerreichbar ? 'rot' : ampelVorlauf(t, hk);
    const wer = massgebend ? ` (massgebend: ${massgebend.name})` : '';
    const rrM = massgebend ? raeume.find((r) => r.id === massgebend.raumId) : undefined;
    const nurFlaecheUrteil = !!rrM && rrM.heizflaechen.length > 0 && rrM.heizflaechen.every((x) => x.kategorie === 'flaeche');
    if (unerreichbar) urteil = nurFlaecheUrteil
      ? `Ungeeignet ohne Massnahmen: Flächenheizung in ${massgebend?.name} zu klein — wird auch bei maximaler Oberflächentemperatur nicht warm; Fläche vergrössern oder zusätzliche Heizfläche.`
      : `Ungeeignet ohne Massnahmen: ${massgebend?.name} wird auch mit ${fmt(vlMax, 0)} °C nicht warm — Heizfläche vergrössern.`;
    else if (gAmpel === 'gruen') urteil = `Gut für Wärmepumpe: Auslegungs-Vorlauf ${fmt(t, 0)} °C ≤ ${fmt(gutBis, 0)} °C${wer}.`;
    else if (gAmpel === 'gelb') urteil = `Kritisch: Auslegungs-Vorlauf ${fmt(t, 0)} °C (${fmt(gutBis, 0)}–${fmt(kritischBis, 0)} °C)${wer} — Hochtemperatur-WP, Hybrid oder Tausch einzelner Heizkörper.`;
    else urteil = `Ungeeignet ohne Massnahmen: Auslegungs-Vorlauf ${fmt(t, 0)} °C > ${fmt(kritischBis, 0)} °C${wer} — Heizkörper in den kritischen Räumen vergrössern.`;
  }
  const gebaeude: WaermeabgabeGebaeude = {
    zielVL: zielGebaeude,
    auslegungsVL,
    auslegungsVLAusHeizflaechen: ausHf,
    ampel: gAmpel,
    urteil,
    kritischeRaeume: kritisch.slice(0, 3),
    massgebenderRaum: massgebend,
    raeumeBewertet: bewertet.length,
    raeumeRot: bewertet.filter((r) => r.ampel === 'rot').length,
    ausgeklammert: raeume.filter((r) => r.ausgeklammert).map((r) => ({ raumId: r.id, name: r.name, grund: e.raeume.find((x) => x.id === r.id)?.ausklammernGrund ?? null })),
  };
  for (const r of raeume) hinweise.push(...r.hinweise);
  const vollstaendig = !hinweise.some((x) => x.stufe === 'fehler') && bewertet.length > 0;
  return { raeume, gebaeude, annahmen: dedupe(annahmenRoh.filter(istAnnahme)), hinweise, vollstaendig };
}
