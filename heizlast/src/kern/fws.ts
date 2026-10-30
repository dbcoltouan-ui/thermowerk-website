/**
 * FWS-Verbrauchsmethode (FWS/AWB WP-Kurs Modul 3, Version 1-2025) — reine Funktionen mit Herkunftsmodell.
 *
 * Rechenweg (Folien 12–16, 29, 36; Aufgaben 1–4):
 *   Jahresmenge je Energieträger = Σ Menge_i / Σ Jahresanteil_i          (Mittel über alle Zeiträume)
 *     Jahresanteil_i: ganzes Kalenderjahr = Tage/365 (Kurs); Teil- oder Mehrjahreszeitraum = HGT_i / Jahres-HGT
 *     (heizgradtage.json, Session 7b), ohne Heizgradtage Tage/365; mit Klimabereinigung HGT_i / HGT_norm für alle.
 *   Q_n,brutto = Σ_Träger Jahresmenge · Heizwert(Konvention) · η        [kWh/a]
 *   Q_n,Heizung = Q_n,brutto − Q_n,WW   (nur wenn WW bisher über die Heizung lief)
 *   Sanierungen: ausgeführte Massnahmen jahresgenau nach FWS-RECHENWEGE §3a (Sub-Perioden, kumulativer
 *   Faktor): W_pre = W · L / Σ(L_j · F_j), W_ist = W_pre · F_heute; geplante Massnahmen multiplikativ.
 *   Q_hl = Q_n,Heizung / t_voll                                           [W]
 *   Methode B: Q_n = h/a · Q_WP (oder Strom-kWh · COP), Q_hl = Q_n / t_voll (Aufgabe 4)
 *   Methode C: Q_n gemessen (Wärmezähler), Q_hl = Q_n / t_voll (Aufgabe 3)
 *   Bauperiode: nur als Fallback mit Band (Folie 36), nie still als Primärwert (Befund FACH-10).
 *
 * Einheiten: Leistung W, Energie kWh/a, Zeit h bzw. Tage. Formatierung ist Sache der UI.
 */
import type { EtaPreset, FwsDaten } from '../daten/fws';
import type { Ampel, Energietraeger, Gebaeudetyp, Konvention } from './typen';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fallback, fmt, messung, override, sammleAnnahmen, tabelle } from './wert';

export type Bedarfsart = 'raumwaerme_wohnen' | 'raumwaerme_ww_wohnen' | 'raumwaerme_wochenendabsenkung';
export type Massnahme = 'fenster' | 'fassade' | 'estrich' | 'kellerdecke' | 'individuell';
export type FwsMethode = 'verbrauch' | 'wpBetriebsstunden' | 'messung' | 'bauperiode';

/**
 * Ein Zeitraum mit Menge: Kalenderjahr (= 365 Tage) oder von–bis (beide inklusiv). Die Felder ab `zeitraum`
 * ergänzt `verbrauchsreihe.ts` (abgeleitete Zeiträume aus Lieferungen/Zählerständen, Heizgradtage); ohne sie
 * rechnet der Kern wie in Session 3 (Tage/365).
 */
export interface VerbrauchsEintrag {
  id?: string;
  energietraeger: Energietraeger;
  /** Menge in der Verbrauchseinheit des Trägers (l, m³n, rm, kg, kWh). */
  menge: number;
  jahr?: number;
  /** ISO-Datum YYYY-MM-DD (auch YYYY-MM: von = Monatsanfang, bis = Monatsende); von und bis inklusiv. */
  von?: string;
  bis?: string;
  /** Heizgradtage des Zeitraums [Kd] manuell (Klimabereinigung und Hochrechnung). */
  hgtIstKd?: number;
  /** Vorab bestimmter Zeitraum (verbrauchsreihe.ts); gewinnt über jahr/von/bis. */
  zeitraum?: Zeitraum;
  /** Menge mit Rechenweg (Lieferungen, Zählerdifferenz). */
  mengeWert?: Wert;
  /** State-Pfad für Hinweise. */
  pfad?: string;
  /** Ganzes Kalenderjahr (365/366 Tage) → keine Hochrechnung nach Heizgradtagen. */
  ganzesJahr?: boolean;
  /** Heizgradtage des Zeitraums (Tabelle oder manuell). */
  hgtIst?: Wert;
  /** Tabellenwert der Heizgradtage (auch wenn manuell überschrieben) — Standardwert für die UI. */
  hgtTabelle?: Wert;
  /** Jahres-HGT der umgebenden Kalenderjahre (Referenz für die Hochrechnung). */
  hgtRef?: Wert;
  /** HGT des Normjahrs der Station (Klimabereinigung). */
  hgtNorm?: Wert;
}

export interface EtaAngabe {
  /** Schlüssel eines η-Presets aus fws.json (z. B. 'alt_ohneWW'). */
  preset?: string;
  /** Eigener Wert; in der Konvention `hi` auf den unteren Heizwert bezogen. */
  wert?: number;
}

export interface Sanierung {
  id?: string;
  massnahme: Massnahme;
  /** Override in %; sonst Kurs-/Bandwert der Massnahme. Pflicht bei `individuell`. */
  einsparungProzent?: number;
  bezeichnung?: string;
  status: 'ausgefuehrt' | 'geplant';
  /** YYYY-MM oder YYYY-MM-DD; bei `ausgefuehrt` nötig für die Zeitgewichtung. */
  datum?: string;
}

export interface TvollEingabe {
  bedarfsart?: Bedarfsart;
  hoeheM?: number;
  override?: number;
}

export interface VerbrauchsEingabe {
  eintraege: VerbrauchsEintrag[];
  eta: Partial<Record<Energietraeger, EtaAngabe>>;
  konvention: Konvention;
  /** Nur wenn das Warmwasser bisher über den Heizkessel erzeugt wurde: Jahresenergie WW (aus warmwasser.ts). */
  wwAbzug?: { qnWwKwhA: Wert; traeger?: Energietraeger };
  /** Optionale HGT-Klimabereinigung (nicht FWS-Kurs); HGT_norm der Station aus klimastationen.json. */
  klimabereinigung?: { aktiv: boolean; hgtNormKd?: number };
}

export interface WpBetriebsstundenEingabe {
  zaehlerH: number;
  betriebsjahre: number;
  /** Heizleistung der WP am Normpunkt [W] (Aufgabe 4: 12 kW bei B0/W35). */
  qWpW?: number;
  /** Alternative: Stromverbrauch der WP [kWh/a] × COP. */
  stromKwhA?: number;
  cop?: number;
  /** Zeitraum des Zählerstands; ohne Angabe: die letzten `betriebsjahre` Jahre vor `heute`. */
  zeitraum?: { von: string; bis: string };
  /** Erdsondenlänge [m] für die Entzugsleistungs-Kontrolle (Aufgabe 4). */
  erdsondeLaengeM?: number;
}

export interface MessungEingabe {
  /** Gemessene Nutzenergie Heizung [kWh/a] (Wärmezähler, Mittel über Jahre). */
  qnHeizungKwhA: number;
  zeitraum?: { von: string; bis: string };
}

export interface BauperiodeEingabe {
  ebfM2: number;
  gebaeudetyp: Gebaeudetyp;
  baujahr: number;
}

export interface FwsEingabe {
  /** Explizite Methodenwahl (keine «erste aktive gewinnt»). */
  methode: FwsMethode;
  tvoll: TvollEingabe;
  verbrauch?: VerbrauchsEingabe;
  wpBetriebsstunden?: WpBetriebsstundenEingabe;
  messung?: MessungEingabe;
  bauperiode?: BauperiodeEingabe;
  sanierungen?: Sanierung[];
  /** Bezugsdatum (ISO) für «heute»; der Kern hat keine Uhr. */
  heute?: string;
}

export interface Streuung {
  ampel: Ampel;
  /** Grösste relative Abweichung eines hochgerechneten Einzelwerts vom Mittel [%], null wenn nicht beurteilbar. */
  prozent: number | null;
  /** Hochgerechnete Einzelwerte [kWh/a] der berücksichtigten Zeiträume. */
  werte: number[];
}

/** Rechenweg je Zeitraum (Session 7b): Menge, Jahresanteil, Hochrechnung, Sanierungs-Teilperioden. */
export interface ZeitraumErgebnis {
  id: string;
  pfad: string;
  zeitraum: Zeitraum;
  ganzesJahr: boolean;
  menge: Wert;
  hgtIst: Wert | null;
  hgtTabelle: Wert | null;
  hgtRef: Wert | null;
  /** Anteil eines Heizjahres für die Heizenergie (Tage/365, HGT/Jahres-HGT; mit Klimabereinigung HGT/HGT_norm). */
  anteil: Wert;
  /** Anteil ohne Klimabereinigung (Hochrechnung der gemessenen Menge). */
  anteilRoh: Wert;
  anteilBasis: 'tage' | 'hgt';
  /** HGT_norm/HGT_ist, nur mit aktiver Klimabereinigung. */
  klimaFaktor: number | null;
  /** Auf ein Jahr hochgerechnete Menge [Einheit/a]. */
  hochgerechnet: Wert;
  /** Zählt für die Streuungs-Ampel. */
  inStreuung: boolean;
  energieKwh: number;
  wwKwh: number;
  heizKwh: number;
  sanierung: {
    faktorIst: number;
    faktorUnsaniert: number;
    subperioden: { tage: number; faktor: number }[];
    /** Ausgeführte Massnahmen mit Datum innerhalb des Zeitraums (Bruchstellen). */
    wirksam: { id?: string | undefined; label: string; datumMs: number; faktor: number }[];
    /** Lage jeder ausgeführten Massnahme mit Datum zum Zeitraum: vorher (Zeitraum ganz vor der Massnahme → wird umgerechnet), innerhalb, nachher (schon enthalten). */
    bezug: { id?: string | undefined; label: string; datumMs: number; lage: 'vorher' | 'innerhalb' | 'nachher' }[];
  };
}

export interface TraegerErgebnis {
  energietraeger: Energietraeger;
  einheit: string;
  anzahlEintraege: number;
  tage: number;
  /** Σ Jahresanteile der Zeiträume (Nenner der Mittelung). */
  jahresanteile: number;
  zeitraeume: ZeitraumErgebnis[];
  jahresmenge: Wert;
  heizwert: Wert;
  eta: Wert;
  /** Nutzenergie vor WW-Abzug und Korrekturen [kWh/a]. */
  qnBrutto: Wert;
  wwAbzug: Wert | null;
  qnHeizungUnsaniert: Wert;
  qnHeizungIst: Wert;
  streuung: Streuung;
}

export interface SanierungErgebnis {
  sanierung: Sanierung;
  label: string;
  einsparung: Wert;
  faktor: number;
  datumMs: number | null;
}

export interface FwsErgebnis {
  methode: FwsMethode;
  methodeLabel: string;
  tvoll: Wert;
  traeger: TraegerErgebnis[];
  /** Σ Träger vor WW-Abzug [kWh/a] (bei Methode B/C/Bauperiode: die jeweilige Nutzenergie). */
  qnBrutto: Wert | null;
  wwAbzug: Wert | null;
  qnHeizungUnsaniert: Wert | null;
  qnHeizungIst: Wert | null;
  /** Heizlast [W]: unsaniert (vor allen Massnahmen), ist (ausgeführte Massnahmen), korr (zusätzlich geplante). */
  qhlUnsaniert: Wert | null;
  qhlIst: Wert | null;
  qhlKorr: Wert | null;
  /** = qhlKorr (massgebend für Zuschläge, Speicher, Gerät); null wenn unvollständig. */
  qhl: Wert | null;
  sanierungen: { ausgefuehrt: SanierungErgebnis[]; geplant: SanierungErgebnis[]; faktorIst: Wert; faktorGeplant: Wert };
  streuung: Streuung;
  klimabereinigungAktiv: boolean;
  /** Nebenrechnungen Methode B (Aufgabe 4). */
  wp?: { betriebsstundenProJahr: Wert; qk?: Wert; entzugsleistung?: Wert; entzugAmpel?: Ampel; betriebsstundenNeu?: Wert };
  bauperiodeBand?: { key: string; label: string; kwhM2a: [number, number] };
  annahmen: Wert<unknown>[];
  hinweise: Hinweis[];
  vollstaendig: boolean;
}

export const METHODEN_LABEL: Record<FwsMethode, string> = {
  verbrauch: 'Aus Brennstoff-/Energieverbrauch (FWS-Kurs, Verbrauchsmethode)',
  wpBetriebsstunden: 'Aus Betriebsstunden der bestehenden Wärmepumpe (FWS-Kurs, Aufgabe 4)',
  messung: 'Aus gemessener Nutzenergie Heizung (Wärmezähler)',
  bauperiode: 'Schätzung aus Bauperiode und EBF (Folie 36) — nur Fallback',
};

/* ------------------------------------------------------------------------------------------------
   Datum und Zeiträume
   ------------------------------------------------------------------------------------------------ */

const TAG_MS = 86_400_000;

/** ISO-Datum (YYYY, YYYY-MM, YYYY-MM-DD) → UTC-Millisekunden des Tagesbeginns; null wenn ungültig. */
export function parseDatum(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(s.trim());
  if (!m) return null;
  const j = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 1;
  const t = m[3] ? Number(m[3]) : 1;
  if (mo < 1 || mo > 12 || t < 1 || t > 31) return null;
  const ms = Date.UTC(j, mo - 1, t);
  const d = new Date(ms);
  if (d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== t) return null;
  return ms;
}

/** Enddatum: YYYY → 31.12., YYYY-MM → Monatsende, sonst wie parseDatum. */
export function parseDatumEnde(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{4})(?:-(\d{1,2}))?$/.exec(s.trim());
  if (!m) return parseDatum(s);
  const j = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 12;
  if (mo < 1 || mo > 12) return null;
  return Date.UTC(j, mo, 0);
}

/** Kalendertage zwischen zwei Tagen, beide inklusiv. */
export function tageInklusiv(vonMs: number, bisMs: number): number {
  return Math.round((bisMs - vonMs) / TAG_MS) + 1;
}

export interface Zeitraum {
  vonMs: number;
  bisMs: number;
  tage: number;
}

/** Zeitraum eines Eintrags: vorab bestimmt, Kalenderjahr = 365 Tage (1.1.–31.12.), sonst von–bis inklusiv. */
export function zeitraumVonEintrag(e: { jahr?: number; von?: string; bis?: string; zeitraum?: Zeitraum }): Zeitraum | null {
  if (e.zeitraum) return e.zeitraum;
  if (e.jahr !== undefined) {
    const vonMs = Date.UTC(e.jahr, 0, 1);
    return { vonMs, bisMs: Date.UTC(e.jahr, 11, 31), tage: 365 };
  }
  const vonMs = parseDatum(e.von);
  const bisMs = parseDatumEnde(e.bis);
  if (vonMs === null || bisMs === null || bisMs < vonMs) return null;
  return { vonMs, bisMs, tage: tageInklusiv(vonMs, bisMs) };
}

/* ------------------------------------------------------------------------------------------------
   Tabellenwerte: t_voll, Heizwert, η, Sanierungs-Einsparung
   ------------------------------------------------------------------------------------------------ */

/** Volllaststunden nach Nutzung × Höhe ü. M. (Folie 16); Override möglich. */
export function volllaststunden(t: TvollEingabe, daten: FwsDaten): Wert {
  if (t.override !== undefined && t.override > 0) return override(t.override, 'h/a', `t_voll manuell ${fmt(t.override, 0)} h/a (Kurstabelle Folie 16 übersteuert)`);
  const art = t.bedarfsart ?? 'raumwaerme_wohnen';
  const zeile = daten.tvoll.bedarfsarten[art];
  if (!zeile) return fallback(2000, 'h/a', `Bedarfsart «${art}» unbekannt — Wohngebäude Mittelland angenommen`, { quelle: 'FWS M3 Folie 16' });
  const hoehe = t.hoeheM;
  const ab800 = hoehe !== undefined && hoehe >= daten.tvoll.hoehenschwelleM;
  const wert = ab800 ? zeile.ab800m : zeile.mittelland;
  const lage = ab800 ? `ab ${daten.tvoll.hoehenschwelleM} m ü. M.` : hoehe === undefined ? 'Mittelland (Höhe nicht angegeben, angenommen < 800 m)' : `Mittelland (${fmt(hoehe, 0)} m ü. M.)`;
  if (hoehe === undefined) return fallback(wert, 'h/a', `${zeile.label}, ${lage}`, { quelle: 'FWS M3 Folie 16', stufe: 'standardwert' });
  return tabelle(wert, 'h/a', `${zeile.label}, ${lage}`, 'FWS M3 Folie 16 «Volllaststunden für die Dimensionierung»', { stufe: 'tabelle' });
}

/** Heizwert je Verbrauchseinheit in der gewählten Konvention. */
export function heizwert(traeger: Energietraeger, konvention: Konvention, daten: FwsDaten): Wert {
  const k = daten.heizwerte.konventionen[konvention];
  const t = k?.traeger[traeger];
  if (!k || !t) return fallback(1, 'kWh', `Kein Heizwert für «${traeger}» in Konvention «${konvention}»`);
  const o: { unsicherheit?: number } = {};
  if (t.unsicherheitProzent !== undefined) o.unsicherheit = t.unsicherheitProzent;
  return tabelle(t.kwhProEinheit, `kWh/${t.einheit}`, `${t.label}: ${fmt(t.kwhProEinheit, 2)} kWh/${t.einheit} (${k.label}; ${t.bezug ?? ''})`.replace('; )', ')'), `FWS M3 Folie 12/13; fws.json heizwerte.${konvention}`, o);
}

function etaPresets(traeger: Energietraeger, daten: FwsDaten): EtaPreset[] {
  const p = daten.heizwerte.etaPresets[traeger];
  return Array.isArray(p) ? p : [];
}

/**
 * Jahresnutzungsgrad η des bisherigen Wärmeerzeugers. Presets sind auf die Kurs-Heizwerte (Ho) bezogen;
 * in der Konvention `hi` werden sie mit Ho/Hi umgerechnet, damit Q_n unverändert bleibt (fws.json etaBezugHinweis).
 * Ein eigener Wert gilt in der jeweiligen Konvention unverändert.
 */
export function jahresnutzungsgrad(traeger: Energietraeger, angabe: EtaAngabe | undefined, konvention: Konvention, daten: FwsDaten): Wert {
  if (angabe?.wert !== undefined && angabe.wert > 0) {
    return eingabe(angabe.wert, '', `η ${fmt(angabe.wert, 2)} (Eingabe, bezogen auf ${konvention === 'hi' ? 'unteren Heizwert Hi' : 'Kurs-Heizwert Ho'})`);
  }
  const presets = etaPresets(traeger, daten);
  const preset = angabe?.preset ? presets.find((p) => p.key === angabe.preset) : undefined;
  const p = preset ?? presets[0];
  if (!p) return fallback(1, '', `Kein η-Preset für «${traeger}», η = 1 angenommen`);
  const basis = p.kurs ?? p.typ;
  const faktor = konvention === 'hi' ? (daten.heizwerte.konventionen.fwsKurs?.traeger[traeger]?.kwhProEinheit ?? 1) / (daten.heizwerte.konventionen.hi?.traeger[traeger]?.kwhProEinheit ?? 1) : 1;
  const wert = basis * faktor;
  const band: [number, number] = [p.min * faktor, p.max * faktor];
  const unsicherheit = Math.round(((p.max - p.min) / 2 / basis) * 1000) / 10;
  const text = `${p.label}: η ${fmt(basis, 2)} (Band ${fmt(p.min, 2)}–${fmt(p.max, 2)}${p.kurs !== undefined ? ', Kurswert' : ', Bandmitte'})${konvention === 'hi' ? ` × ${fmt(faktor, 3)} auf Hi umgerechnet = ${fmt(wert, 3)}` : ''}`;
  if (!preset) return fallback(wert, '', `${text} — Standardwert, kein Preset gewählt`, { quelle: 'FWS M3 Folie 12 (BFE Leistungsgarantie)', stufe: 'standardwert', band, unsicherheit });
  return tabelle(wert, '', text, 'FWS M3 Folie 12 (BFE Leistungsgarantie)', { stufe: 'preset', band, unsicherheit });
}

/** Einsparung einer Sanierungsmassnahme in % (Folie 36 / Aufgabe 2) als Wert mit Band. */
export function sanierungsEinsparung(s: Sanierung, daten: FwsDaten): Wert {
  const m = daten.sanierungen.massnahmen.find((x) => x.key === s.massnahme);
  const label = s.massnahme === 'individuell' ? (s.bezeichnung ?? 'Individuelle Massnahme') : (m?.label ?? s.massnahme);
  if (s.einsparungProzent !== undefined) return eingabe(s.einsparungProzent, '%', `${label}: Einsparung ${fmt(s.einsparungProzent, 0)} % (Eingabe)`);
  if (!m || m.typ === null) return fallback(0, '%', `${label}: keine Einsparung angegeben (0 % angenommen)`, { quelle: 'FWS M3 Folie 36' });
  return tabelle(m.typ, '%', `${label}: Einsparung ${m.typ} % (Band ${m.min}–${m.max} %${m.kursHinweis ? ', ' + m.kursHinweis : ''})`, 'FWS M3 Folie 36; Aufgabe 2 Lösung', {
    band: [m.min, m.max],
    unsicherheit: Math.round(((m.max - m.min) / 2 / m.typ) * 100),
  });
}

/* ------------------------------------------------------------------------------------------------
   Sanierungen: kumulativer Faktor und Sub-Perioden-Korrektur (FWS-RECHENWEGE §3a)
   ------------------------------------------------------------------------------------------------ */

function sanierungenAuswerten(liste: Sanierung[] | undefined, daten: FwsDaten, hinweise: Hinweis[]): { ausgefuehrt: SanierungErgebnis[]; geplant: SanierungErgebnis[] } {
  const ausgefuehrt: SanierungErgebnis[] = [];
  const geplant: SanierungErgebnis[] = [];
  for (const s of liste ?? []) {
    const einsparung = sanierungsEinsparung(s, daten);
    const faktor = 1 - einsparung.wert / 100;
    const label = einsparung.begruendung.split(':')[0] ?? s.massnahme;
    const datumMs = parseDatum(s.datum);
    if (s.status === 'ausgefuehrt' && datumMs === null) {
      hinweise.push({
        stufe: 'warnung',
        code: 'sanierung.datum.fehlt',
        text: `«${label}» ist als ausgeführt markiert, hat aber kein Datum: angenommen vor dem Betrachtungszeitraum (im Verbrauch bereits enthalten).`,
        pfad: s.id ? `sanierungen.${s.id}.datum` : 'sanierungen',
      });
    }
    (s.status === 'ausgefuehrt' ? ausgefuehrt : geplant).push({ sanierung: s, label, einsparung, faktor, datumMs });
  }
  ausgefuehrt.sort((a, b) => (a.datumMs ?? -Infinity) - (b.datumMs ?? -Infinity));
  return { ausgefuehrt, geplant };
}

/** Kumulativer Einsparfaktor F(t) = Π (1 − p_k) über ausgeführte Massnahmen mit Datum ≤ t (ohne Datum: immer enthalten). */
function kumulierterFaktor(ausgefuehrt: SanierungErgebnis[], tMs: number): number {
  let f = 1;
  for (const s of ausgefuehrt) if (s.datumMs === null || s.datumMs <= tMs) f *= s.faktor;
  return f;
}

/**
 * Korrektur eines Messwerts W eines Zeitraums auf Vor-Sanierungs- und Ist-Zustand (§3a):
 *   W_pre = W · L / Σ(L_j · F_j),  W_ist = W_pre · F_heute.
 * Gibt die beiden Faktoren zurück (faktorUnsaniert = L/Σ, faktorIst = F_heute · L/Σ).
 */
export function subperiodenKorrektur(z: Zeitraum, ausgefuehrt: SanierungErgebnis[]): { faktorUnsaniert: number; faktorIst: number; fHeute: number; subperioden: { tage: number; faktor: number }[] } {
  const fHeute = ausgefuehrt.reduce((f, s) => f * s.faktor, 1);
  const bruchstellen = ausgefuehrt
    .map((s) => s.datumMs)
    .filter((d): d is number => d !== null && d > z.vonMs && d <= z.bisMs)
    .sort((a, b) => a - b);
  const subperioden: { tage: number; faktor: number }[] = [];
  let t = z.vonMs;
  let summe = 0;
  for (const d of bruchstellen) {
    const tage = tageInklusiv(t, d - TAG_MS);
    const f = kumulierterFaktor(ausgefuehrt, t);
    subperioden.push({ tage, faktor: f });
    summe += tage * f;
    t = d;
  }
  const tageRest = tageInklusiv(t, z.bisMs);
  const fRest = kumulierterFaktor(ausgefuehrt, t);
  subperioden.push({ tage: tageRest, faktor: fRest });
  summe += tageRest * fRest;
  // L und L_j in derselben Masseinheit (Kalendertage), damit ein Kalenderjahr mit 366 Tagen keinen Faktor 365/366 erzeugt.
  const lKalender = subperioden.reduce((a, b) => a + b.tage, 0);
  const faktorUnsaniert = summe > 0 ? lKalender / summe : 1;
  return { faktorUnsaniert, faktorIst: faktorUnsaniert * fHeute, fHeute, subperioden };
}

/* ------------------------------------------------------------------------------------------------
   Verbrauchsmodell (Jahresraster)
   ------------------------------------------------------------------------------------------------ */

function streuungAuswerten(werte: number[], daten: FwsDaten): Streuung {
  if (werte.length < 2) return { ampel: 'grau', prozent: null, werte };
  const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
  if (mittel <= 0) return { ampel: 'grau', prozent: null, werte };
  const prozent = Math.max(...werte.map((w) => Math.abs(w - mittel) / mittel)) * 100;
  const s = daten.verbrauch.streuung;
  const ampel: Ampel = prozent >= s.rotAbProzent ? 'rot' : prozent >= s.gelbAbProzent ? 'gelb' : 'gruen';
  return { ampel, prozent, werte };
}

function schlechtereAmpel(a: Ampel, b: Ampel): Ampel {
  const rang: Record<Ampel, number> = { grau: 0, gruen: 1, gelb: 2, rot: 3 };
  return rang[a] >= rang[b] ? a : b;
}

interface EintragAuswertung {
  eintrag: VerbrauchsEintrag;
  zeitraum: Zeitraum;
}

function datumKurz(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}

/**
 * Jahresanteil eines Zeitraums (Mass für «wie viel eines Heizjahres» er abdeckt):
 *  - `roh` (Hochrechnung der gemessenen Menge): ganzes Kalenderjahr = Tage/365 (Kurs, unverändert); sonst
 *    HGT_ist / Jahres-HGT der umgebenden Kalenderjahre; ohne Heizgradtage Tage/365 (Fallback mit Warnung).
 *  - `heizung` (Nenner für die Heizenergie): wie `roh`; mit Klimabereinigung HGT_ist / HGT_norm für alle
 *    Zeiträume (Normjahr-Äquivalent, Daniel 30.10.: «bereinigt = alle bereinigt, sonst laut Kurs»).
 */
export function jahresanteil(e: VerbrauchsEintrag, z: Zeitraum, klima: { aktiv: boolean; hgtNormKd?: number | undefined }, hinweise: Hinweis[], daten: FwsDaten): { roh: Wert; heizung: Wert; basis: 'tage' | 'hgt'; klimaFaktor: number | null } {
  const ganzesJahr = e.ganzesJahr ?? (e.jahr !== undefined || ((z.tage === 365 || z.tage === 366) && new Date(z.vonMs).getUTCDate() === new Date(z.bisMs + TAG_MS).getUTCDate() && new Date(z.vonMs).getUTCMonth() === new Date(z.bisMs + TAG_MS).getUTCMonth()));
  const hgtIstW = e.hgtIst?.wert ?? (e.hgtIstKd !== undefined && e.hgtIstKd > 0 ? e.hgtIstKd : undefined);
  const hgtNormW = e.hgtNorm?.wert ?? klima.hgtNormKd;
  const tageText = `${datumKurz(z.vonMs)}–${datumKurz(z.bisMs)}`;
  let roh: Wert;
  let basis: 'tage' | 'hgt';
  if (ganzesJahr) {
    const a = z.tage / 365;
    roh = berechnet(a, '', `Jahresanteil = ${z.tage} Tage / 365 = ${fmt(a, 3)} (ganzes Kalenderjahr${e.jahr !== undefined ? ` ${e.jahr}` : ''}, Kurs: keine Hochrechnung)`, [], { quelle: 'FWS M3 Folie 29' });
    basis = 'tage';
  } else if (hgtIstW !== undefined && e.hgtRef && e.hgtRef.wert > 0) {
    const a = hgtIstW / e.hgtRef.wert;
    roh = berechnet(a, '', `Jahresanteil = HGT ${fmt(hgtIstW, 0)} / Jahres-HGT ${fmt(e.hgtRef.wert, 0)} Kd = ${fmt(a, 3)} (${tageText}, ${z.tage} Tage: Hochrechnung nach Heizgradtagen)`, [e.hgtIst, e.hgtRef], { quelle: 'heizgradtage.json; Thermowerk-Regel (Hochrechnung nach HGT-Anteil)' });
    basis = 'hgt';
  } else {
    const a = z.tage / 365;
    roh = fallback(a, '', `geschätzt nach Tagen: Jahresanteil = ${z.tage} Tage / 365 = ${fmt(a, 3)} (${tageText}; keine Heizgradtage verfügbar)`, { stufe: 'tage', unsicherheit: Math.round(Math.min(50, (365 / Math.max(z.tage, 30)) * 10)), quelle: 'FWS M3 Folie 29 (Mittel über Tage)' });
    basis = 'tage';
  }
  if (klima.aktiv && hgtIstW !== undefined && hgtNormW !== undefined && hgtNormW > 0) {
    const a = hgtIstW / hgtNormW;
    const k = hgtNormW / hgtIstW;
    if (k < daten.klimabereinigung.faktorPlausibelMin || k > daten.klimabereinigung.faktorPlausibelMax) {
      hinweise.push({ stufe: 'warnung', code: 'klima.faktor.unplausibel', text: `Klimafaktor ${fmt(k, 2)} für ${tageText} unplausibel (HGT_norm ${fmt(hgtNormW, 0)} / HGT_ist ${fmt(hgtIstW, 0)}).`, ...(e.pfad ? { pfad: e.pfad } : {}) });
    }
    const heizung = berechnet(a, '', `Jahresanteil klimabereinigt = HGT ${fmt(hgtIstW, 0)} / HGT_norm ${fmt(hgtNormW, 0)} Kd = ${fmt(a, 3)} (${tageText}; Klimafaktor ${fmt(k, 3)}, nicht FWS-Kurs)`, [e.hgtIst, e.hgtNorm], { quelle: 'fws.json klimabereinigung (Thermowerk-Annahme)' });
    return { roh, heizung, basis, klimaFaktor: k };
  }
  return { roh, heizung: roh, basis, klimaFaktor: null };
}

/** Auswertung der Zeiträume je Energieträger inkl. WW-Abzug, Sanierungs- und Klimakorrektur. */
function verbrauchAuswerten(
  v: VerbrauchsEingabe,
  ausgefuehrt: SanierungErgebnis[],
  daten: FwsDaten,
  hinweise: Hinweis[],
): { traeger: TraegerErgebnis[]; streuung: Streuung; klimaAktiv: boolean; fehler: boolean } {
  const traegerListe: TraegerErgebnis[] = [];
  let streuung: Streuung = { ampel: 'grau', prozent: null, werte: [] };
  let fehler = false;
  const klima = v.klimabereinigung?.aktiv === true;
  const hgtNormGlobal = v.klimabereinigung?.hgtNormKd;
  if (klima && !(hgtNormGlobal !== undefined && hgtNormGlobal > 0) && !v.eintraege.some((e) => e.hgtNorm)) {
    hinweise.push({ stufe: 'fehler', code: 'klima.hgtNorm.fehlt', text: 'Klimabereinigung aktiv, aber HGT-Normwert der Station fehlt (Standort in Schritt 1 erfassen).', pfad: 'verbrauch.klimabereinigung' });
    fehler = true;
  }

  // Gruppieren je Träger, Zeiträume prüfen.
  const gruppen = new Map<Energietraeger, EintragAuswertung[]>();
  for (const e of v.eintraege) {
    const z = zeitraumVonEintrag(e);
    if (!z) {
      hinweise.push({ stufe: 'fehler', code: 'verbrauch.zeitraum.ungueltig', text: `Eintrag ${e.id ?? ''} (${e.energietraeger}): Zeitraum ungültig (Jahr oder von/bis nötig, bis ≥ von).`, pfad: e.pfad ?? (e.id ? `verbrauch.eintraege.${e.id}` : 'verbrauch.eintraege') });
      fehler = true;
      continue;
    }
    if (!(e.menge > 0) && !e.mengeWert) {
      hinweise.push({ stufe: 'warnung', code: 'verbrauch.menge.leer', text: `Eintrag ${e.id ?? ''} (${e.energietraeger}): Menge fehlt oder 0 — wird als Nullverbrauch im Zeitraum gewertet.`, pfad: e.pfad ? `${e.pfad}.menge` : e.id ? `verbrauch.eintraege.${e.id}.menge` : 'verbrauch.eintraege' });
    }
    const liste = gruppen.get(e.energietraeger) ?? [];
    liste.push({ eintrag: e, zeitraum: z });
    gruppen.set(e.energietraeger, liste);
  }

  // WW-Abzug dem Träger zuordnen (Angabe oder grösster Jahreswert).
  let wwTraeger: Energietraeger | null = null;
  if (v.wwAbzug) {
    if (v.wwAbzug.traeger && gruppen.has(v.wwAbzug.traeger)) wwTraeger = v.wwAbzug.traeger;
    else {
      let best: { t: Energietraeger; kwh: number } | null = null;
      for (const [t, liste] of gruppen) {
        const hw = heizwert(t, v.konvention, daten).wert;
        const eta = jahresnutzungsgrad(t, v.eta[t], v.konvention, daten).wert;
        const kwh = liste.reduce((s, a) => s + a.eintrag.menge * hw * eta, 0);
        if (!best || kwh > best.kwh) best = { t, kwh };
      }
      wwTraeger = best?.t ?? null;
      if (wwTraeger && gruppen.size > 1) hinweise.push({ stufe: 'info', code: 'verbrauch.wwAbzug.traeger', text: `Warmwasser-Abzug dem Energieträger «${wwTraeger}» zugeordnet (grösster Anteil); bei Bedarf wählen.` });
    }
  }

  let alleJahreswerte: number[] = [];
  let tageGesamt = 0;
  for (const [t, liste] of gruppen) {
    liste.sort((a, b) => a.zeitraum.vonMs - b.zeitraum.vonMs);
    // Überlappung → Fehler für diesen Träger.
    let ueberlappt = false;
    for (let i = 1; i < liste.length; i++) {
      if (liste[i]!.zeitraum.vonMs <= liste[i - 1]!.zeitraum.bisMs) {
        ueberlappt = true;
        hinweise.push({
          stufe: 'fehler',
          code: 'verbrauch.ueberlappung',
          text: `${t}: Die Zeiträume der Einträge ${liste[i - 1]!.eintrag.id ?? i} und ${liste[i]!.eintrag.id ?? i + 1} überlappen sich — bitte korrigieren.`,
          pfad: liste[i]!.eintrag.pfad ?? (liste[i]!.eintrag.id ? `verbrauch.eintraege.${liste[i]!.eintrag.id}` : 'verbrauch.eintraege'),
        });
      }
    }
    if (ueberlappt) {
      fehler = true;
      continue;
    }
    const hw = heizwert(t, v.konvention, daten);
    const eta = jahresnutzungsgrad(t, v.eta[t], v.konvention, daten);
    const einheit = hw.einheit.replace(/^kWh\//, '');
    const tage = liste.reduce((s, a) => s + a.zeitraum.tage, 0);
    const menge = liste.reduce((s, a) => s + Math.max(0, a.eintrag.menge), 0);

    // Je Zeitraum: Jahresanteil, WW-Abzug (zeitanteilig), Sanierungskorrektur.
    const wwJahr = wwTraeger === t ? (v.wwAbzug?.qnWwKwhA.wert ?? 0) : 0;
    const zeitraeume: ZeitraumErgebnis[] = [];
    let summeAnteil = 0;
    let summeAnteilRoh = 0;
    let summeTage = 0;
    let summeHeizRoh = 0;
    let summeIst = 0;
    let summeUnsaniert = 0;
    let summeWw = 0;
    let klimaFehlt = false;
    const jahreswerte: number[] = [];
    for (const a of liste) {
      const e = a.eintrag;
      const mengeE = Math.max(0, e.menge);
      const { roh: anteilRoh, heizung: anteil, basis, klimaFaktor } = jahresanteil(e, a.zeitraum, { aktiv: klima, hgtNormKd: hgtNormGlobal }, hinweise, daten);
      if (klima && klimaFaktor === null) klimaFehlt = true;
      const energieW = mengeE * hw.wert * eta.wert;
      const wwW = (wwJahr * a.zeitraum.tage) / 365;
      let heizW = energieW - wwW;
      if (heizW < 0) {
        hinweise.push({ stufe: 'warnung', code: 'verbrauch.wwAbzug.zuGross', text: `${t}: Warmwasser-Abzug (${fmt(wwW, 0)} kWh) übersteigt die Nutzenergie des Zeitraums ${e.id ?? ''} (${fmt(energieW, 0)} kWh) — Heizanteil auf 0 gesetzt. Warmwasser-Angaben «bisher» prüfen.`, ...(e.pfad ? { pfad: e.pfad } : {}) });
        heizW = 0;
      }
      summeWw += Math.min(wwW, energieW);
      const korr = subperiodenKorrektur(a.zeitraum, ausgefuehrt);
      summeAnteil += anteil.wert;
      summeAnteilRoh += anteilRoh.wert;
      summeTage += a.zeitraum.tage;
      summeHeizRoh += heizW;
      summeIst += heizW * korr.faktorIst;
      summeUnsaniert += heizW * korr.faktorUnsaniert;
      const hochW = anteilRoh.wert > 0 ? mengeE / anteilRoh.wert : 0;
      const hochgerechnet = berechnet(hochW, `${einheit}/a`, `${fmt(mengeE, 0)} ${einheit} / Jahresanteil ${fmt(anteilRoh.wert, 3)} = ${fmt(hochW, 0)} ${einheit}/a`, [e.mengeWert ?? null, anteilRoh], { quelle: 'FWS M3 Folie 29' });
      const wirksam = ausgefuehrt.filter((s) => s.datumMs !== null && s.datumMs > a.zeitraum.vonMs && s.datumMs <= a.zeitraum.bisMs);
      const bezug = ausgefuehrt.filter((s) => s.datumMs !== null).map((s) => ({ id: s.sanierung.id, label: s.label, datumMs: s.datumMs!, lage: (s.datumMs! > a.zeitraum.bisMs ? 'vorher' : s.datumMs! <= a.zeitraum.vonMs ? 'nachher' : 'innerhalb') as 'vorher' | 'innerhalb' | 'nachher' }));
      const zaehlt = basis === 'tage' ? a.zeitraum.tage >= daten.verbrauch.streuung.mindestTageJeEintrag : anteilRoh.wert >= daten.verbrauch.streuung.mindestHgtAnteil;
      if (zaehlt) jahreswerte.push(hochW);
      zeitraeume.push({
        id: e.id ?? `${t}-${zeitraeume.length + 1}`,
        pfad: e.pfad ?? (e.id ? `verbrauch.eintraege.${e.id}` : 'verbrauch.eintraege'),
        zeitraum: a.zeitraum,
        ganzesJahr: e.ganzesJahr ?? e.jahr !== undefined,
        menge: e.mengeWert ?? eingabe(mengeE, einheit, `${fmt(mengeE, 0)} ${einheit}`),
        hgtIst: e.hgtIst ?? null,
        hgtTabelle: e.hgtTabelle ?? null,
        hgtRef: e.hgtRef ?? null,
        anteil,
        anteilRoh,
        anteilBasis: basis,
        klimaFaktor,
        hochgerechnet,
        inStreuung: zaehlt,
        energieKwh: energieW,
        wwKwh: Math.min(wwW, energieW),
        heizKwh: heizW,
        sanierung: { faktorIst: korr.faktorIst, faktorUnsaniert: korr.faktorUnsaniert, subperioden: korr.subperioden, wirksam: wirksam.map((s) => ({ id: s.sanierung.id, label: s.label, datumMs: s.datumMs!, faktor: s.faktor })), bezug },
      });
    }
    if (klima && klimaFehlt) hinweise.push({ stufe: 'warnung', code: 'klima.hgtIst.fehlt', text: `${t}: Klimabereinigung aktiv, aber nicht alle Zeiträume haben Heizgradtage — diese bleiben unbereinigt (nach Tagen bzw. HGT-Anteil).` });

    // Jahreswerte: Heizanteil über die Jahresanteile (Heizgradtage), Warmwasser über die Zeit (Tage/365).
    const wwJahrW = summeTage > 0 ? (summeWw * 365) / summeTage : 0;
    const heizRohJahrW = summeAnteilRoh > 0 ? summeHeizRoh / summeAnteilRoh : 0;
    const qnBruttoW = heizRohJahrW + wwJahrW;
    const jahresmengeW = hw.wert * eta.wert > 0 ? qnBruttoW / (hw.wert * eta.wert) : 0;
    const nurTage = zeitraeume.every((z) => z.anteilBasis === 'tage');
    const jahresmenge = berechnet(
      jahresmengeW,
      `${einheit}/a`,
      liste.length === 1 && liste[0]!.zeitraum.tage === 365 && nurTage
        ? `${fmt(menge, 1)} ${einheit} in einem Jahr`
        : nurTage
          ? `Σ ${fmt(menge, 1)} ${einheit} über ${liste.length} Zeiträume / ${tage} Tage × 365 = ${fmt(jahresmengeW, 1)} ${einheit}/a (Mittel)`
          : `Σ ${fmt(menge, 1)} ${einheit} über ${liste.length} Zeiträume, Heizanteil / Σ Jahresanteile ${fmt(summeAnteilRoh, 3)} (Teiljahre nach Heizgradtagen hochgerechnet) = ${fmt(jahresmengeW, 1)} ${einheit}/a (Mittel)`,
      zeitraeume.map((z) => z.anteilRoh),
      { quelle: 'FWS M3 Folie 29 (Mittel über 3–5 relevante Jahre)' },
    );
    const qnBrutto = berechnet(qnBruttoW, 'kWh/a', `Q_n = ${fmt(jahresmengeW, 1)} ${einheit}/a × ${fmt(hw.wert, 2)} kWh/${einheit} × η ${fmt(eta.wert, 3)} = ${fmt(qnBruttoW, 0)} kWh/a`, [jahresmenge, hw, eta], { quelle: 'FWS M3 Folie 12/13' });

    const wwAbzug = wwTraeger === t && v.wwAbzug ? berechnet(wwJahrW, 'kWh/a', `Q_n,WW bisher ${fmt(v.wwAbzug.qnWwKwhA.wert, 0)} kWh/a vom Verbrauch ${t} abgezogen (Aufgabe 2: Q_n = Q_n,HWW − Q_n,WW)`, [v.wwAbzug.qnWwKwhA]) : null;
    const qnIstW = summeAnteil > 0 ? summeIst / summeAnteil : 0;
    const qnUnsW = summeAnteil > 0 ? summeUnsaniert / summeAnteil : 0;
    const korrText = ausgefuehrt.length ? `, ausgeführte Sanierungen zeitgewichtet (§3a, Faktor ${fmt(qnIstW / Math.max(qnUnsW, 1e-9), 4)})` : '';
    const klimaText = klima ? ', Klimabereinigung HGT (nicht FWS-Kurs)' : '';
    const qnHeizungIst = berechnet(qnIstW, 'kWh/a', `Q_n,Heizung ${t} = ${fmt(qnBruttoW, 0)}${wwAbzug ? ' − ' + fmt(wwAbzug.wert, 0) : ''} kWh/a${korrText}${klimaText} = ${fmt(qnIstW, 0)} kWh/a`, [qnBrutto, wwAbzug, ...ausgefuehrt.map((s) => s.einsparung)]);
    const qnHeizungUnsaniert = berechnet(qnUnsW, 'kWh/a', `Q_n,Heizung ${t} vor allen Sanierungen = ${fmt(qnUnsW, 0)} kWh/a`, [qnBrutto, wwAbzug]);

    const st = streuungAuswerten(jahreswerte, daten);
    alleJahreswerte = alleJahreswerte.concat(jahreswerte.map((w) => w * hw.wert * eta.wert));
    streuung = { ampel: schlechtereAmpel(streuung.ampel, st.ampel), prozent: Math.max(streuung.prozent ?? 0, st.prozent ?? 0) || null, werte: alleJahreswerte };
    if (st.ampel === 'rot') hinweise.push({ stufe: 'warnung', code: 'verbrauch.streuung.rot', text: `${t}: Die hochgerechneten Jahresverbräuche streuen um ${fmt(st.prozent ?? 0, 0)} % — Teilbelegung, Abwesenheiten oder Sanierungen im Zeitraum klären (Folie 29).` });
    else if (st.ampel === 'gelb') hinweise.push({ stufe: 'info', code: 'verbrauch.streuung.gelb', text: `${t}: Hochgerechnete Jahresverbräuche streuen um ${fmt(st.prozent ?? 0, 0)} %.` });
    tageGesamt = Math.max(tageGesamt, tage);

    traegerListe.push({ energietraeger: t, einheit, anzahlEintraege: liste.length, tage, jahresanteile: summeAnteil, zeitraeume, jahresmenge, heizwert: hw, eta, qnBrutto, wwAbzug, qnHeizungUnsaniert, qnHeizungIst, streuung: st });
  }

  if (!fehler && traegerListe.length && tageGesamt < daten.verbrauch.mindestJahreEmpfohlen * 365) {
    hinweise.push({ stufe: 'info', code: 'verbrauch.zeitraum.kurz', text: `Betrachtungszeitraum ${fmt(tageGesamt / 365, 1)} Jahre — der Kurs empfiehlt ${daten.verbrauch.mindestJahreEmpfohlen}–${daten.verbrauch.maxJahreEmpfohlen} relevante Jahre (Folie 29).` });
  }
  if (!traegerListe.length && !fehler) {
    hinweise.push({ stufe: 'fehler', code: 'verbrauch.leer', text: 'Keine Verbrauchseinträge vorhanden.', pfad: 'verbrauch.eintraege' });
    fehler = true;
  }
  return { traeger: traegerListe, streuung, klimaAktiv: klima, fehler };
}

/* ------------------------------------------------------------------------------------------------
   Bauperiode (Fallback)
   ------------------------------------------------------------------------------------------------ */

/** Bauperioden-Eintrag (Folie 36/37) für ein Baujahr. */
export function bauperiodeFuerBaujahr(baujahr: number, daten: FwsDaten) {
  return daten.bauperioden.perioden.find((p) => (p.von === null || baujahr >= p.von) && (p.bis === null || baujahr <= p.bis)) ?? null;
}

/* ------------------------------------------------------------------------------------------------
   Hauptfunktion
   ------------------------------------------------------------------------------------------------ */

function leer(methode: FwsMethode, tvoll: Wert, hinweise: Hinweis[], sanierungen: FwsErgebnis['sanierungen'], annahmen: Wert<unknown>[]): FwsErgebnis {
  return {
    methode,
    methodeLabel: METHODEN_LABEL[methode],
    tvoll,
    traeger: [],
    qnBrutto: null,
    wwAbzug: null,
    qnHeizungUnsaniert: null,
    qnHeizungIst: null,
    qhlUnsaniert: null,
    qhlIst: null,
    qhlKorr: null,
    qhl: null,
    sanierungen,
    streuung: { ampel: 'grau', prozent: null, werte: [] },
    klimabereinigungAktiv: false,
    annahmen,
    hinweise,
    vollstaendig: false,
  };
}

/** Heizlast nach FWS-Kurs aus der explizit gewählten Methode. */
export function heizlastFws(e: FwsEingabe, daten: FwsDaten): FwsErgebnis {
  const hinweise: Hinweis[] = [];
  const tvoll = volllaststunden(e.tvoll, daten);
  const { ausgefuehrt, geplant } = sanierungenAuswerten(e.sanierungen, daten, hinweise);
  const fIst = ausgefuehrt.reduce((f, s) => f * s.faktor, 1);
  const fGeplant = geplant.reduce((f, s) => f * s.faktor, 1);
  const faktorIst = berechnet(fIst, '', ausgefuehrt.length ? `Π (1 − p) ausgeführter Massnahmen: ${ausgefuehrt.map((s) => `${s.label} ${fmt(s.einsparung.wert, 0)} %`).join(', ')} → ${fmt(fIst, 4)}` : 'keine ausgeführten Sanierungen', ausgefuehrt.map((s) => s.einsparung));
  const faktorGeplant = berechnet(fGeplant, '', geplant.length ? `Π (1 − p) geplanter Massnahmen: ${geplant.map((s) => `${s.label} ${fmt(s.einsparung.wert, 0)} %`).join(', ')} → ${fmt(fGeplant, 4)} (Aufgabe 2: 0.85 · 0.92 · 0.90)` : 'keine geplanten Sanierungen', geplant.map((s) => s.einsparung));
  const sanierungen = { ausgefuehrt, geplant, faktorIst, faktorGeplant };
  const annahmen: Wert<unknown>[] = sammleAnnahmen([tvoll, ...ausgefuehrt.map((s) => s.einsparung), ...geplant.map((s) => s.einsparung)]);

  let traeger: TraegerErgebnis[] = [];
  let qnBrutto: Wert | null = null;
  let wwAbzug: Wert | null = null;
  let qnUns: Wert | null = null;
  let qnIst: Wert | null = null;
  let streuung: Streuung = { ampel: 'grau', prozent: null, werte: [] };
  let klimaAktiv = false;
  let wp: FwsErgebnis['wp'] | undefined;
  let bauperiodeBand: FwsErgebnis['bauperiodeBand'] | undefined;

  if (e.methode === 'verbrauch') {
    if (!e.verbrauch) {
      hinweise.push({ stufe: 'fehler', code: 'verbrauch.fehlt', text: 'Methode «Verbrauch» gewählt, aber keine Verbrauchsangaben.', pfad: 'verbrauch' });
      return leer(e.methode, tvoll, hinweise, sanierungen, annahmen);
    }
    const a = verbrauchAuswerten(e.verbrauch, ausgefuehrt, daten, hinweise);
    if (a.fehler) return leer(e.methode, tvoll, hinweise, sanierungen, annahmen);
    traeger = a.traeger;
    streuung = a.streuung;
    klimaAktiv = a.klimaAktiv;
    const bruttoW = traeger.reduce((s, t) => s + t.qnBrutto.wert, 0);
    qnBrutto = berechnet(bruttoW, 'kWh/a', traeger.length > 1 ? `Q_n,total = ${traeger.map((t) => fmt(t.qnBrutto.wert, 0)).join(' + ')} = ${fmt(bruttoW, 0)} kWh/a (bivalent, Aufgabe 1B)` : `Q_n = ${fmt(bruttoW, 0)} kWh/a`, traeger.map((t) => t.qnBrutto));
    const wwW = traeger.reduce((s, t) => s + (t.wwAbzug?.wert ?? 0), 0);
    wwAbzug = e.verbrauch.wwAbzug ? berechnet(wwW, 'kWh/a', `Warmwasser-Abzug ${fmt(wwW, 0)} kWh/a (WW bisher über die Heizung)`, [e.verbrauch.wwAbzug.qnWwKwhA]) : null;
    const istW = traeger.reduce((s, t) => s + t.qnHeizungIst.wert, 0);
    const unsW = traeger.reduce((s, t) => s + t.qnHeizungUnsaniert.wert, 0);
    qnIst = berechnet(istW, 'kWh/a', `Q_n,Heizung = ${fmt(istW, 0)} kWh/a (Ist-Zustand${klimaAktiv ? ', Klimabereinigung HGT — nicht FWS-Kurs' : ''})`, traeger.map((t) => t.qnHeizungIst));
    qnUns = berechnet(unsW, 'kWh/a', `Q_n,Heizung vor Sanierungen = ${fmt(unsW, 0)} kWh/a`, traeger.map((t) => t.qnHeizungUnsaniert));
    for (const t of traeger) annahmen.push(...sammleAnnahmen([t.heizwert, t.eta]));
  } else if (e.methode === 'wpBetriebsstunden') {
    const b = e.wpBetriebsstunden;
    if (!b || !(b.zaehlerH > 0) || !(b.betriebsjahre > 0) || !((b.qWpW ?? 0) > 0 || ((b.stromKwhA ?? 0) > 0 && (b.cop ?? 0) > 0))) {
      hinweise.push({ stufe: 'fehler', code: 'wp.angaben.fehlen', text: 'Methode «WP-Betriebsstunden»: Zählerstand, Betriebsjahre und WP-Leistung (oder Strom-kWh × COP) nötig.', pfad: 'wpBetriebsstunden' });
      return leer(e.methode, tvoll, hinweise, sanierungen, annahmen);
    }
    const hProJahr = b.zaehlerH / b.betriebsjahre;
    const betriebsstundenProJahr = berechnet(hProJahr, 'h/a', `Betriebsstunden/Jahr = ${fmt(b.zaehlerH, 0)} h / ${fmt(b.betriebsjahre, 1)} Jahre = ${fmt(hProJahr, 0)} h/a`, [], { quelle: 'FWS M3 Aufgabe 4' });
    let qnW: number;
    let qnText: string;
    if ((b.qWpW ?? 0) > 0) {
      qnW = hProJahr * (b.qWpW! / 1000);
      qnText = `Q_n,Heizung = ${fmt(hProJahr, 0)} h/a × ${fmt(b.qWpW! / 1000, 2)} kW = ${fmt(qnW, 0)} kWh/a`;
    } else {
      qnW = b.stromKwhA! * b.cop!;
      qnText = `Q_n,Heizung = ${fmt(b.stromKwhA!, 0)} kWh/a Strom × COP ${fmt(b.cop!, 2)} = ${fmt(qnW, 0)} kWh/a`;
    }
    const qnMess = messung(qnW, 'kWh/a', qnText);
    qnBrutto = qnMess;
    // Zeitraum des Zählers für die Sanierungs-Gewichtung.
    let z: Zeitraum | null = b.zeitraum ? zeitraumVonEintrag(b.zeitraum) : null;
    if (!z) {
      const heute = parseDatum(e.heute);
      if (heute !== null) {
        const bisMs = heute;
        const vonMs = Date.UTC(new Date(bisMs).getUTCFullYear() - Math.round(b.betriebsjahre), new Date(bisMs).getUTCMonth(), new Date(bisMs).getUTCDate());
        z = { vonMs, bisMs, tage: tageInklusiv(vonMs, bisMs) };
      }
    }
    const korr = z ? subperiodenKorrektur(z, ausgefuehrt) : { faktorUnsaniert: 1 / fIst, faktorIst: 1 };
    if (!z && ausgefuehrt.length) hinweise.push({ stufe: 'info', code: 'wp.zeitraum.fehlt', text: 'Zeitraum des Zählerstands unbekannt: ausgeführte Sanierungen gelten als im Messwert enthalten.' });
    qnIst = berechnet(qnW * korr.faktorIst, 'kWh/a', `${qnText}${ausgefuehrt.length ? ` × Sanierungsfaktor ${fmt(korr.faktorIst, 4)}` : ''}`, [qnMess]);
    qnUns = berechnet(qnW * korr.faktorUnsaniert, 'kWh/a', 'vor allen Sanierungen', [qnMess]);
    wp = { betriebsstundenProJahr };
    if ((b.qWpW ?? 0) > 0 && (b.cop ?? 0) > 0) {
      const qk = (b.qWpW! * (b.cop! - 1)) / b.cop!;
      wp.qk = berechnet(qk, 'W', `Kälteleistung Q_k = Q_WP · (COP − 1)/COP = ${fmt(b.qWpW! / 1000, 2)} kW × ${fmt((b.cop! - 1) / b.cop!, 3)} = ${fmt(qk / 1000, 2)} kW`, [], { quelle: 'FWS M3 Aufgabe 4' });
      if ((b.erdsondeLaengeM ?? 0) > 0) {
        const spez = qk / b.erdsondeLaengeM!;
        const a = daten.methodeB.entzugsleistungAmpelWProM;
        wp.entzugsleistung = berechnet(spez, 'W/m', `Spez. Entzugsleistung = ${fmt(qk / 1000, 2)} kW / ${fmt(b.erdsondeLaengeM!, 0)} m = ${fmt(spez, 0)} W/m (Ampel ≤ ${a.gruenBis} grün, ≤ ${a.gelbBis} gelb; SIA 384/6 — Annahme)`, [wp.qk], { quelle: 'fws.json methodeB (Annahme, SIA 384/6)' });
        wp.entzugAmpel = spez <= a.gruenBis ? 'gruen' : spez <= a.gelbBis ? 'gelb' : 'rot';
        if (wp.entzugAmpel === 'rot') hinweise.push({ stufe: 'warnung', code: 'wp.erdsonde.zuKurz', text: `Spezifische Entzugsleistung ${fmt(spez, 0)} W/m über ${a.gelbBis} W/m — Erdsonde für diese Leistung zu kurz (Aufgabe 4: Soletemperaturen überwachen).` });
      }
    }
  } else if (e.methode === 'messung') {
    const m = e.messung;
    if (!m || !(m.qnHeizungKwhA > 0)) {
      hinweise.push({ stufe: 'fehler', code: 'messung.fehlt', text: 'Methode «Messung»: gemessene Nutzenergie Heizung (kWh/a) fehlt.', pfad: 'messung.qnHeizungKwhA' });
      return leer(e.methode, tvoll, hinweise, sanierungen, annahmen);
    }
    const qnMess = messung(m.qnHeizungKwhA, 'kWh/a', `Nutzenergie Heizung gemessen: ${fmt(m.qnHeizungKwhA, 0)} kWh/a (Wärmezähler)`);
    qnBrutto = qnMess;
    const z = m.zeitraum ? zeitraumVonEintrag(m.zeitraum) : null;
    const korr = z ? subperiodenKorrektur(z, ausgefuehrt) : { faktorUnsaniert: 1 / fIst, faktorIst: 1 };
    if (!z && ausgefuehrt.length) hinweise.push({ stufe: 'info', code: 'messung.zeitraum.fehlt', text: 'Messzeitraum unbekannt: ausgeführte Sanierungen gelten als im Messwert enthalten.' });
    qnIst = berechnet(m.qnHeizungKwhA * korr.faktorIst, 'kWh/a', `Q_n,Heizung = ${fmt(m.qnHeizungKwhA, 0)} kWh/a${ausgefuehrt.length ? ` × Sanierungsfaktor ${fmt(korr.faktorIst, 4)}` : ''}`, [qnMess]);
    qnUns = berechnet(m.qnHeizungKwhA * korr.faktorUnsaniert, 'kWh/a', 'vor allen Sanierungen', [qnMess]);
  } else {
    const b = e.bauperiode;
    if (!b || !(b.ebfM2 > 0) || !(b.baujahr > 0)) {
      hinweise.push({ stufe: 'fehler', code: 'bauperiode.fehlt', text: 'Bauperioden-Schätzung: EBF, Gebäudetyp und Baujahr nötig.', pfad: 'bauperiode' });
      return leer(e.methode, tvoll, hinweise, sanierungen, annahmen);
    }
    const p = bauperiodeFuerBaujahr(b.baujahr, daten);
    if (!p) {
      hinweise.push({ stufe: 'fehler', code: 'bauperiode.unbekannt', text: `Kein Bauperioden-Band für Baujahr ${b.baujahr}.`, pfad: 'bauperiode.baujahr' });
      return leer(e.methode, tvoll, hinweise, sanierungen, annahmen);
    }
    const band = p.kwhM2a[b.gebaeudetyp];
    const min = band[0]!;
    const max = band[1]!;
    const mitte = (min + max) / 2;
    const uns = Math.round(((max - min) / (max + min)) * 1000) / 10;
    const spez = fallback(mitte, 'kWh/(m²·a)', `Spez. Heizwärmebedarf unsaniert ${p.label} ${b.gebaeudetyp.toUpperCase()}: ${min}–${max} kWh/(m²·a), Bandmitte ${fmt(mitte, 1)} (±${fmt(uns, 0)} %) — grobe Schätzung, keine Dimensionierungsgrundlage`, {
      quelle: 'FWS M3 Folie 36 (Schneider 2014)',
      band: [min, max],
      unsicherheit: uns,
      stufe: 'bauperiode',
    });
    annahmen.push(spez);
    bauperiodeBand = { key: p.key, label: p.label, kwhM2a: [min, max] };
    const qnUnsW = mitte * b.ebfM2;
    qnBrutto = berechnet(qnUnsW, 'kWh/a', `Q_n = ${fmt(mitte, 1)} kWh/(m²·a) × ${fmt(b.ebfM2, 0)} m² EBF = ${fmt(qnUnsW, 0)} kWh/a (unsaniert)`, [spez], { band: [min * b.ebfM2, max * b.ebfM2] });
    qnUns = qnBrutto;
    qnIst = berechnet(qnUnsW * fIst, 'kWh/a', `Q_n,Heizung = ${fmt(qnUnsW, 0)} kWh/a × ${fmt(fIst, 4)} (ausgeführte Sanierungen)`, [qnBrutto, faktorIst]);
    hinweise.push({ stufe: 'warnung', code: 'bauperiode.fallback', text: `Heizlast nur aus Bauperiode geschätzt (±${fmt(uns, 0)} %) — Verbrauchsdaten nachreichen oder raumweise rechnen.` });
  }

  const qhlUnsaniertW = (qnUns!.wert * 1000) / tvoll.wert;
  const qhlIstW = (qnIst!.wert * 1000) / tvoll.wert;
  const qhlKorrW = qhlIstW * fGeplant;
  const qhlUnsaniert = berechnet(qhlUnsaniertW, 'W', `Q_hl,unsaniert = ${fmt(qnUns!.wert, 0)} kWh/a / ${fmt(tvoll.wert, 0)} h/a = ${fmt(qhlUnsaniertW / 1000, 2)} kW`, [qnUns, tvoll], { quelle: 'FWS M3 Folie 12/16' });
  const qhlIst = berechnet(qhlIstW, 'W', `Q_hl = Q_n,Heizung / t_voll = ${fmt(qnIst!.wert, 0)} kWh/a / ${fmt(tvoll.wert, 0)} h/a = ${fmt(qhlIstW / 1000, 2)} kW`, [qnIst, tvoll], { quelle: 'FWS M3 Folie 12/16' });
  const qhlKorr = geplant.length
    ? berechnet(qhlKorrW, 'W', `Q_hl mit geplanten Sanierungen = ${fmt(qhlIstW / 1000, 2)} kW × ${fmt(fGeplant, 4)} = ${fmt(qhlKorrW / 1000, 2)} kW`, [qhlIst, faktorGeplant], { quelle: 'FWS M3 Folie 36; Aufgabe 2' })
    : qhlIst;
  if (qnUns!.band) {
    qhlUnsaniert.band = [(qnUns!.band[0] * 1000) / tvoll.wert, (qnUns!.band[1] * 1000) / tvoll.wert];
    qhlIst.band = [qhlUnsaniert.band[0] * fIst, qhlUnsaniert.band[1] * fIst];
    qhlKorr.band = [qhlIst.band[0] * fGeplant, qhlIst.band[1] * fGeplant];
  }

  return {
    methode: e.methode,
    methodeLabel: METHODEN_LABEL[e.methode],
    tvoll,
    traeger,
    qnBrutto,
    wwAbzug,
    qnHeizungUnsaniert: qnUns,
    qnHeizungIst: qnIst,
    qhlUnsaniert,
    qhlIst,
    qhlKorr,
    qhl: qhlKorr,
    sanierungen,
    streuung,
    klimabereinigungAktiv: klimaAktiv,
    ...(wp ? { wp } : {}),
    ...(bauperiodeBand ? { bauperiodeBand } : {}),
    annahmen,
    hinweise,
    vollstaendig: !hinweise.some((h) => h.stufe === 'fehler'),
  };
}

/** Neue Betriebsstunden einer WP inkl. Warmwasser (Aufgabe 4): (Q_n,Heizung + Q_n,WW) / Q_WP. */
export function betriebsstundenNeu(qnHeizungKwhA: number, qnWwKwhA: number, qWpW: number): Wert {
  const h = (qnHeizungKwhA + qnWwKwhA) / (qWpW / 1000);
  return berechnet(h, 'h/a', `Betriebsstunden neu = (${fmt(qnHeizungKwhA, 0)} + ${fmt(qnWwKwhA, 0)}) kWh/a / ${fmt(qWpW / 1000, 2)} kW = ${fmt(h, 0)} h/a`, [], { quelle: 'FWS M3 Aufgabe 4' });
}

/** Spez. Heizleistung-Band (W/m²) der Bauperiode — für plausi.ts. */
export function bauperiodeBandWm2(baujahr: number, gebaeudetyp: Gebaeudetyp, daten: FwsDaten): { label: string; band: [number, number] } | null {
  const p = bauperiodeFuerBaujahr(baujahr, daten);
  if (!p) return null;
  const b = p.wM2[gebaeudetyp];
  return { label: p.label, band: [b[0]!, b[1]!] };
}

/** η-Presets eines Energieträgers (für UI-Auswahl). */
export function etaPresetsFuer(traeger: Energietraeger, daten: FwsDaten): EtaPreset[] {
  return etaPresets(traeger, daten);
}
