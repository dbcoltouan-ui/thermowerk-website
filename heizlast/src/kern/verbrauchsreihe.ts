/**
 * Verbrauchsreihen (Session 7b): Aus den vier Eingabearten je Energieträger werden Zeiträume mit Menge abgeleitet,
 * geprüft und mit Rechenweg und Herkunft versehen. fws.ts rechnet danach wie bisher auf diesen Zeiträumen.
 *
 *   (a) lieferungen:    Tank-/Lagerstände mit Datum + Lieferungen mit Datum und Menge
 *                       Verbrauch zwischen zwei Ständen = Stand alt + Σ Lieferungen dazwischen − Stand neu
 *                       (ein Stand am Tag einer Lieferung gilt als Stand VOR der Lieferung, wie im FWS-Rechner
 *                       «Tankinhalt Anfang» + Lieferung; Zeitraum = [Stand alt, Stand neu − 1 Tag])
 *   (b) zaehlerstaende: Zählerstände mit Datum → Differenzen (Gas, Strom, Fernwärme, Wärmezähler)
 *   (c) zeitraeume:     Zeitraum von–bis mit Menge (taggenau oder Monat: `bis` YYYY-MM = Monatsende)
 *   (d) jahr:           Kalenderjahr als Kurzform (= Zeitraum 1.1.–31.12., 365 Tage im Kurs)
 *
 * Prüfungen: negativer Verbrauch, Lieferung ohne spätere Ablesung, Lieferung vor der ersten Ablesung, nur eine
 * Ablesung, Überlappung (c/d), Lücken zwischen Zeiträumen, Zeitraum < 300 Tage (Hochrechnung nötig).
 */
import type { FwsDaten } from '../daten/fws';
import type { HgtDaten } from '../daten/heizgradtage';
import type { KlimaDaten } from '../daten/klima';
import type { VerbrauchsEintrag, Zeitraum } from './fws';
import { parseDatum, zeitraumVonEintrag } from './fws';
import { hgtFuerZeitraum, hgtJahresreferenz, referenzJahre } from './heizgradtage';
import type { Energietraeger } from './typen';
import type { Hinweis, Wert } from './wert';
import { berechnet, eingabe, fmt, override, tabelle } from './wert';

export type Erfassungsart = 'zeitraeume' | 'lieferungen' | 'zaehlerstaende';

export const ERFASSUNGSARTEN: ReadonlyArray<{ key: Erfassungsart; label: string; text: string }> = [
  { key: 'zeitraeume', label: 'Zeiträume oder Kalenderjahre', text: 'Rechnungsbeträge je Jahr oder je Zeitraum (von–bis).' },
  { key: 'lieferungen', label: 'Lieferungen und Tank-/Lagerstände', text: 'Öl, Pellets, Holz: Stand mit Datum, dazwischen alle Lieferungen.' },
  { key: 'zaehlerstaende', label: 'Zählerstände', text: 'Gas, Strom, Fernwärme, Wärmezähler: abgelesene Stände mit Datum.' },
];

/** Zeitraum (c) oder Kalenderjahr (d). */
export interface ZeitraumEintrag {
  id?: string;
  menge: number;
  jahr?: number;
  von?: string;
  bis?: string;
  /** Heizgradtage des Zeitraums manuell [Kd] (überschreibt den Tabellenwert). */
  hgtIstKd?: number;
}

/** Tank-/Lagerstand mit Datum (a); ein Stand am Tag einer Lieferung = Stand vor der Lieferung. */
export interface Ablesung {
  id?: string;
  datum: string;
  bestand: number;
  /** HGT des Zeitraums, der mit dieser Ablesung endet [Kd] (manuell). */
  hgtIstKd?: number;
}

export interface Lieferung {
  id?: string;
  datum: string;
  menge: number;
}

export interface Zaehlerstand {
  id?: string;
  datum: string;
  stand: number;
  /** HGT des Zeitraums, der mit diesem Zählerstand endet [Kd] (manuell). */
  hgtIstKd?: number;
}

export interface VerbrauchsReihe {
  id?: string;
  energietraeger: Energietraeger;
  art: Erfassungsart;
  zeitraeume?: ZeitraumEintrag[];
  ablesungen?: Ablesung[];
  lieferungen?: Lieferung[];
  zaehlerstaende?: Zaehlerstand[];
}

/** Ein abgeleiteter Zeitraum mit Menge und Rechenweg; wird als `VerbrauchsEintrag` an fws.ts übergeben. */
export interface AbgeleiteterZeitraum {
  id: string;
  /** State-Pfad des massgebenden Eintrags (Hinweise, HGT-Feld). */
  pfad: string;
  energietraeger: Energietraeger;
  zeitraum: Zeitraum;
  menge: Wert;
  art: Erfassungsart;
  ganzesJahr: boolean;
  /** Manuelle HGT-Angabe [Kd]. */
  hgtIstKd?: number;
  /** Beteiligte Einträge (für die UI: «Stand 15.9.2023 + 2 Lieferungen − Stand 20.5.2024»). */
  teile: { pfad: string; text: string }[];
}

export interface ReiheErgebnis {
  energietraeger: Energietraeger;
  art: Erfassungsart;
  zeitraeume: AbgeleiteterZeitraum[];
  hinweise: Hinweis[];
  fehler: boolean;
}

const TAG_MS = 86_400_000;

function datumText(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}

function istGanzesJahr(z: Zeitraum): boolean {
  if (z.tage !== 365 && z.tage !== 366) return false;
  const a = new Date(z.vonMs);
  const b = new Date(z.bisMs + TAG_MS);
  return a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

/** Zeiträume aus Lieferungen + Ablesungen. */
function ausLieferungen(r: VerbrauchsReihe, pfad: string, einheit: string, hinweise: Hinweis[]): { zeitraeume: AbgeleiteterZeitraum[]; fehler: boolean } {
  const out: AbgeleiteterZeitraum[] = [];
  let fehler = false;
  const ablesungen = (r.ablesungen ?? [])
    .map((a, i) => ({ a, ms: parseDatum(a.datum), pfad: `${pfad}.ablesungen.${a.id ?? i}` }))
    .filter((x) => {
      if (x.ms === null) {
        hinweise.push({ stufe: 'fehler', code: 'verbrauch.ablesung.datum', text: `${einheit}: Tank-/Lagerstand ohne gültiges Datum.`, pfad: `${x.pfad}.datum` });
        fehler = true;
        return false;
      }
      return true;
    })
    .sort((x, y) => x.ms! - y.ms!);
  const lieferungen = (r.lieferungen ?? [])
    .map((l, i) => ({ l, ms: parseDatum(l.datum), pfad: `${pfad}.lieferungen.${l.id ?? i}` }))
    .filter((x) => {
      if (x.ms === null) {
        hinweise.push({ stufe: 'fehler', code: 'verbrauch.lieferung.datum', text: `${einheit}: Lieferung ohne gültiges Datum.`, pfad: `${x.pfad}.datum` });
        fehler = true;
        return false;
      }
      if (!(x.l.menge > 0)) hinweise.push({ stufe: 'warnung', code: 'verbrauch.lieferung.menge', text: `${einheit}: Lieferung vom ${datumText(x.ms)} ohne Menge.`, pfad: `${x.pfad}.menge` });
      return true;
    })
    .sort((x, y) => x.ms! - y.ms!);

  if (ablesungen.length < 2) {
    hinweise.push({ stufe: 'fehler', code: 'verbrauch.ablesungen.zuWenig', text: `${einheit}: Mindestens zwei Tank-/Lagerstände mit Datum nötig (Anfang und Ende), dazwischen die Lieferungen.`, pfad: `${pfad}.ablesungen` });
    return { zeitraeume: out, fehler: true };
  }
  const erste = ablesungen[0]!.ms!;
  const letzte = ablesungen[ablesungen.length - 1]!.ms!;
  for (const l of lieferungen) {
    if (l.ms! < erste) hinweise.push({ stufe: 'warnung', code: 'verbrauch.lieferung.vorErsterAblesung', text: `${einheit}: Lieferung vom ${datumText(l.ms!)} liegt vor dem ersten Stand (${datumText(erste)}) und wird nicht ausgewertet.`, pfad: l.pfad });
    if (l.ms! >= letzte) hinweise.push({ stufe: 'warnung', code: 'verbrauch.lieferung.ohneAblesung', text: `${einheit}: Lieferung vom ${datumText(l.ms!)} hat keinen späteren Stand — erst mit einer weiteren Ablesung auswertbar.`, pfad: l.pfad });
  }
  for (let i = 1; i < ablesungen.length; i++) {
    const alt = ablesungen[i - 1]!;
    const neu = ablesungen[i]!;
    if (neu.ms === alt.ms) {
      hinweise.push({ stufe: 'warnung', code: 'verbrauch.ablesung.gleicherTag', text: `${einheit}: Zwei Stände am ${datumText(neu.ms!)} — der zweite wird ignoriert.`, pfad: neu.pfad });
      continue;
    }
    const dazwischen = lieferungen.filter((l) => l.ms! >= alt.ms! && l.ms! < neu.ms!);
    const summe = dazwischen.reduce((s, l) => s + (l.l.menge > 0 ? l.l.menge : 0), 0);
    const verbrauch = alt.a.bestand + summe - neu.a.bestand;
    const zeitraum: Zeitraum = { vonMs: alt.ms!, bisMs: neu.ms! - TAG_MS, tage: Math.round((neu.ms! - alt.ms!) / TAG_MS) };
    const teile = [{ pfad: alt.pfad, text: `Stand ${datumText(alt.ms!)}: ${fmt(alt.a.bestand, 0)} ${einheit}` }, ...dazwischen.map((l) => ({ pfad: l.pfad, text: `Lieferung ${datumText(l.ms!)}: ${fmt(l.l.menge, 0)} ${einheit}` })), { pfad: neu.pfad, text: `Stand ${datumText(neu.ms!)}: ${fmt(neu.a.bestand, 0)} ${einheit}` }];
    const text = `Stand ${datumText(alt.ms!)} ${fmt(alt.a.bestand, 0)}${dazwischen.length ? ` + Lieferungen ${dazwischen.map((l) => fmt(l.l.menge, 0)).join(' + ')}` : ''} − Stand ${datumText(neu.ms!)} ${fmt(neu.a.bestand, 0)} = ${fmt(verbrauch, 0)} ${einheit} in ${zeitraum.tage} Tagen`;
    if (verbrauch < 0) {
      hinweise.push({ stufe: 'fehler', code: 'verbrauch.negativ', text: `${einheit}: ${text} — negativer Verbrauch: Stand oder Lieferung prüfen (ein Stand am Tag einer Lieferung gilt als Stand vor der Lieferung).`, pfad: neu.pfad });
      fehler = true;
      continue;
    }
    if (!dazwischen.length && verbrauch === 0) hinweise.push({ stufe: 'warnung', code: 'verbrauch.null', text: `${einheit}: Zwischen ${datumText(alt.ms!)} und ${datumText(neu.ms!)} weder Lieferung noch Verbrauch.`, pfad: neu.pfad });
    const id = neu.a.id ?? `a${i}`;
    out.push({ id, pfad: neu.pfad, energietraeger: r.energietraeger, zeitraum, menge: berechnet(verbrauch, einheit, text, [], { quelle: 'Lieferungen und Tank-/Lagerstände (FWS-Rechner-Logik)' }), art: 'lieferungen', ganzesJahr: istGanzesJahr(zeitraum), ...(neu.a.hgtIstKd !== undefined ? { hgtIstKd: neu.a.hgtIstKd } : {}), teile });
  }
  return { zeitraeume: out, fehler };
}

/** Zeiträume aus Zählerständen. */
function ausZaehlerstaenden(r: VerbrauchsReihe, pfad: string, einheit: string, hinweise: Hinweis[]): { zeitraeume: AbgeleiteterZeitraum[]; fehler: boolean } {
  const out: AbgeleiteterZeitraum[] = [];
  let fehler = false;
  const staende = (r.zaehlerstaende ?? [])
    .map((z, i) => ({ z, ms: parseDatum(z.datum), pfad: `${pfad}.zaehlerstaende.${z.id ?? i}` }))
    .filter((x) => {
      if (x.ms === null) {
        hinweise.push({ stufe: 'fehler', code: 'verbrauch.zaehler.datum', text: `${einheit}: Zählerstand ohne gültiges Datum.`, pfad: `${x.pfad}.datum` });
        fehler = true;
        return false;
      }
      return true;
    })
    .sort((x, y) => x.ms! - y.ms!);
  if (staende.length < 2) {
    hinweise.push({ stufe: 'fehler', code: 'verbrauch.zaehler.zuWenig', text: `${einheit}: Mindestens zwei Zählerstände mit Datum nötig.`, pfad: `${pfad}.zaehlerstaende` });
    return { zeitraeume: out, fehler: true };
  }
  for (let i = 1; i < staende.length; i++) {
    const alt = staende[i - 1]!;
    const neu = staende[i]!;
    if (neu.ms === alt.ms) {
      hinweise.push({ stufe: 'warnung', code: 'verbrauch.zaehler.gleicherTag', text: `${einheit}: Zwei Zählerstände am ${datumText(neu.ms!)} — der zweite wird ignoriert.`, pfad: neu.pfad });
      continue;
    }
    const diff = neu.z.stand - alt.z.stand;
    const zeitraum: Zeitraum = { vonMs: alt.ms!, bisMs: neu.ms! - TAG_MS, tage: Math.round((neu.ms! - alt.ms!) / TAG_MS) };
    const text = `Zähler ${datumText(neu.ms!)} ${fmt(neu.z.stand, 0)} − ${datumText(alt.ms!)} ${fmt(alt.z.stand, 0)} = ${fmt(diff, 0)} ${einheit} in ${zeitraum.tage} Tagen`;
    if (diff < 0) {
      hinweise.push({ stufe: 'fehler', code: 'verbrauch.negativ', text: `${einheit}: ${text} — negativer Verbrauch: Zählerwechsel? Stände prüfen oder ab dem neuen Zähler eine eigene Reihe erfassen.`, pfad: neu.pfad });
      fehler = true;
      continue;
    }
    const id = neu.z.id ?? `z${i}`;
    out.push({ id, pfad: neu.pfad, energietraeger: r.energietraeger, zeitraum, menge: berechnet(diff, einheit, text, [], { quelle: 'Zählerstände (Differenz)' }), art: 'zaehlerstaende', ganzesJahr: istGanzesJahr(zeitraum), ...(neu.z.hgtIstKd !== undefined ? { hgtIstKd: neu.z.hgtIstKd } : {}), teile: [{ pfad: alt.pfad, text: `Zähler ${datumText(alt.ms!)}: ${fmt(alt.z.stand, 0)}` }, { pfad: neu.pfad, text: `Zähler ${datumText(neu.ms!)}: ${fmt(neu.z.stand, 0)}` }] });
  }
  return { zeitraeume: out, fehler };
}

/** Zeiträume aus Einträgen von–bis bzw. Kalenderjahr. */
function ausZeitraeumen(r: VerbrauchsReihe, pfad: string, einheit: string, hinweise: Hinweis[]): { zeitraeume: AbgeleiteterZeitraum[]; fehler: boolean } {
  const out: AbgeleiteterZeitraum[] = [];
  let fehler = false;
  (r.zeitraeume ?? []).forEach((e, i) => {
    const p = `${pfad}.zeitraeume.${e.id ?? i}`;
    const z = zeitraumVonEintrag(e);
    if (!z) {
      hinweise.push({ stufe: 'fehler', code: 'verbrauch.zeitraum.ungueltig', text: `${einheit}: Zeitraum ungültig (Jahr oder von/bis nötig, bis nach von).`, pfad: p });
      fehler = true;
      return;
    }
    if (!(e.menge > 0)) hinweise.push({ stufe: 'warnung', code: 'verbrauch.menge.leer', text: `${einheit}: Menge für ${e.jahr !== undefined ? `Jahr ${e.jahr}` : `${datumText(z.vonMs)}–${datumText(z.bisMs)}`} fehlt oder 0 — zählt als Nullverbrauch.`, pfad: `${p}.menge` });
    const menge = e.menge > 0 ? e.menge : 0;
    const text = e.jahr !== undefined ? `Kalenderjahr ${e.jahr}: ${fmt(menge, 0)} ${einheit}` : `${datumText(z.vonMs)}–${datumText(z.bisMs)} (${z.tage} Tage): ${fmt(menge, 0)} ${einheit}`;
    out.push({ id: e.id ?? `e${i}`, pfad: p, energietraeger: r.energietraeger, zeitraum: z, menge: eingabe(menge, einheit, text), art: 'zeitraeume', ganzesJahr: e.jahr !== undefined || istGanzesJahr(z), ...(e.hgtIstKd !== undefined ? { hgtIstKd: e.hgtIstKd } : {}), teile: [{ pfad: p, text }] });
  });
  return { zeitraeume: out, fehler };
}

/** Leitet die Zeiträume einer Reihe ab und prüft sie (Überlappung, Lücken, kurze Zeiträume). */
export function zeitraeumeAusReihe(r: VerbrauchsReihe, pfad: string, daten: FwsDaten): ReiheErgebnis {
  const hinweise: Hinweis[] = [];
  const info = daten.heizwerte.konventionen.fwsKurs?.traeger[r.energietraeger];
  const einheit = (info?.einheit ?? '').replace('m3n', 'm³');
  const res = r.art === 'lieferungen' ? ausLieferungen(r, pfad, einheit, hinweise) : r.art === 'zaehlerstaende' ? ausZaehlerstaenden(r, pfad, einheit, hinweise) : ausZeitraeumen(r, pfad, einheit, hinweise);
  const liste = [...res.zeitraeume].sort((a, b) => a.zeitraum.vonMs - b.zeitraum.vonMs);
  let fehler = res.fehler;
  for (let i = 1; i < liste.length; i++) {
    const a = liste[i - 1]!;
    const b = liste[i]!;
    if (b.zeitraum.vonMs <= a.zeitraum.bisMs) {
      hinweise.push({ stufe: 'fehler', code: 'verbrauch.ueberlappung', text: `${einheit}: Die Zeiträume ${datumText(a.zeitraum.vonMs)}–${datumText(a.zeitraum.bisMs)} und ${datumText(b.zeitraum.vonMs)}–${datumText(b.zeitraum.bisMs)} überlappen sich — bitte korrigieren.`, pfad: b.pfad });
      fehler = true;
    } else {
      const luecke = Math.round((b.zeitraum.vonMs - a.zeitraum.bisMs) / TAG_MS) - 1;
      if (luecke >= daten.verbrauch.lueckeHinweisAbTagen) hinweise.push({ stufe: 'info', code: 'verbrauch.luecke', text: `Lücke von ${luecke} Tagen zwischen ${datumText(a.zeitraum.bisMs)} und ${datumText(b.zeitraum.vonMs)} — Verbrauch dazwischen fehlt (nur Mittelung über die erfassten Zeiträume).`, pfad: `${b.pfad}.zeitraum` });
    }
  }
  for (const z of liste) {
    if (!z.ganzesJahr && z.zeitraum.tage < daten.verbrauch.streuung.mindestTageJeEintrag) hinweise.push({ stufe: 'info', code: 'verbrauch.zeitraum.kurzerEintrag', text: `${z.zeitraum.tage} Tage, kürzer als ein Jahr — wird nach Heizgradtag-Anteil aufs Jahr hochgerechnet.`, pfad: `${z.pfad}.zeitraum` });
  }
  if (!liste.length && !fehler) {
    hinweise.push({ stufe: 'fehler', code: 'verbrauch.reihe.leer', text: `${einheit}: Keine auswertbaren Zeiträume.`, pfad });
    fehler = true;
  }
  return { energietraeger: r.energietraeger, art: r.art, zeitraeume: liste, hinweise, fehler };
}

export interface HgtKontext {
  stationKey: string | null;
  hgt: HgtDaten;
  klima: KlimaDaten;
}

/**
 * Ergänzt einen abgeleiteten Zeitraum um Heizgradtage (manuell > Tabelle) und die Jahresreferenz für die
 * Hochrechnung, und formt ihn in einen `VerbrauchsEintrag` für fws.ts um.
 */
export function eintragMitHgt(z: AbgeleiteterZeitraum, k: HgtKontext, hinweise: Hinweis[]): VerbrauchsEintrag {
  const e: VerbrauchsEintrag = { id: z.id, energietraeger: z.energietraeger, menge: z.menge.wert, von: isoDatum(z.zeitraum.vonMs), bis: isoDatum(z.zeitraum.bisMs), zeitraum: z.zeitraum, mengeWert: z.menge, pfad: z.pfad, ganzesJahr: z.ganzesJahr };
  const n = referenzJahre(z.zeitraum.tage);
  const station = k.stationKey ? k.hgt.stationen[k.stationKey] : undefined;
  const tabelleHgt = k.stationKey && station ? hgtFuerZeitraum(k.stationKey, z.zeitraum.vonMs, z.zeitraum.bisMs, k.hgt) : null;
  if (tabelleHgt?.wert) e.hgtTabelle = tabelleHgt.wert;
  if (z.hgtIstKd !== undefined && z.hgtIstKd > 0) {
    e.hgtIst = override(z.hgtIstKd, 'Kd', `HGT ${fmt(z.hgtIstKd, 0)} Kd manuell${tabelleHgt?.wert ? ` (Tabelle: ${fmt(tabelleHgt.wert.wert, 0)} Kd)` : ''}`);
    e.hgtIstKd = z.hgtIstKd;
  } else if (tabelleHgt?.wert) {
    e.hgtIst = tabelleHgt.wert;
    e.hgtIstKd = tabelleHgt.wert.wert;
  } else {
    const grund = !k.stationKey ? 'kein Standort mit Klimastation (Schritt 1)' : !station ? `keine Heizgradtag-Daten für Station «${k.stationKey}»` : `Monatswerte fehlen (${tabelleHgt?.fehlend.join(', ')})`;
    if (!z.ganzesJahr) hinweise.push({ stufe: 'warnung', code: 'verbrauch.hgt.fehlt', text: `Keine Heizgradtage — ${grund}; Hochrechnung nach Tagen (ungenau bei Teiljahren). HGT manuell eintragen oder Standort erfassen.`, pfad: `${z.pfad}.zeitraum` });
    else hinweise.push({ stufe: 'info', code: 'verbrauch.hgt.fehltGanzesJahr', text: `Keine Heizgradtage (${grund}) — ganzes Jahr, keine Hochrechnung nötig.`, pfad: `${z.pfad}.zeitraum` });
  }
  if (!z.ganzesJahr && k.stationKey && station) {
    const ref = hgtJahresreferenz(k.stationKey, z.zeitraum.bisMs, n, k.hgt);
    if (ref) e.hgtRef = ref;
  }
  if (k.stationKey) {
    const st = k.klima.stationen.find((s) => s.key === k.stationKey);
    if (st) e.hgtNorm = tabelle(st.hgt2012Kd, 'Kd', `HGT 20/12 Normjahr Station ${st.name}: ${fmt(st.hgt2012Kd, 0)} Kd (SIA 2028, Mittel 1984–2003)`, 'klimastationen.json (SIA 2028-C1 Tabelle 6)');
  }
  return e;
}

export function isoDatum(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
