/**
 * Heizgradtage je Zeitraum (Session 7b): HGT 20/12 aus den Monatswerten in data/heizgradtage.json
 * (MeteoSchweiz-Tagesmittel je SIA-2028-Station). Reine Funktionen, Daten als Parameter.
 *
 *   HGT(Zeitraum) = Σ ganze Monate + Teilmonate anteilig nach Tagen (Näherung, da nur Monatswerte vorliegen)
 *   Jahresreferenz(bis, n) = HGT der n Kalenderjahre (365/366 Tage), die am Tag `bis` enden, geteilt durch n
 *
 * Verwendung (fws.ts): Zeiträume, die kein ganzes Jahr sind, werden nach dem Anteil HGT(Zeitraum)/Jahresreferenz
 * auf ein Jahr hochgerechnet (Kurs-Logik ohne Klimabereinigung); mit Klimabereinigung gilt für alle Zeiträume
 * HGT(Zeitraum)/HGT_norm (klimastationen.json). Einheit Kd (Kelvin-Tage).
 */
import type { HgtDaten } from '../daten/heizgradtage';
import { tageInklusiv } from './fws';
import type { Wert } from './wert';
import { fmt, tabelle } from './wert';

const TAG_MS = 86_400_000;
const Q_HGT = 'heizgradtage.json (MeteoSchweiz Open Data, Tagesmittel tre200d0 → HGT 20/12 je Monat)';

export interface HgtMonat {
  jahr: number;
  monat: number;
  /** Tage des Zeitraums in diesem Monat. */
  tage: number;
  tageImMonat: number;
  /** Monatswert [Kd], null wenn keine Daten. */
  hgtMonat: number | null;
  /** Anteil des Monats am Zeitraum [Kd] (ganzer Monat = hgtMonat, Teilmonat anteilig). */
  hgt: number | null;
}

export interface HgtZeitraum {
  /** HGT des Zeitraums [Kd]; null wenn Monate fehlen. */
  wert: Wert | null;
  monate: HgtMonat[];
  teilmonate: number;
  /** Fehlende Monate als YYYY-MM. */
  fehlend: string[];
}

function tageImMonat(jahr: number, monat: number): number {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

function monatsWert(stationKey: string, jahr: number, monat: number, daten: HgtDaten): number | null {
  const st = daten.stationen[stationKey];
  const w = st?.monate[String(jahr)]?.[monat - 1];
  return typeof w === 'number' && Number.isFinite(w) ? w : null;
}

/** Verfügbarer Datenbereich einer Station (erster/letzter Monat mit Wert), null ohne Station. */
export function hgtVerfuegbar(stationKey: string, daten: HgtDaten): { von: string; bis: string } | null {
  const st = daten.stationen[stationKey];
  if (!st) return null;
  let von: string | null = null;
  let bis: string | null = null;
  for (const jahr of Object.keys(st.monate).sort()) {
    st.monate[jahr]!.forEach((w, i) => {
      if (typeof w !== 'number') return;
      const k = `${jahr}-${String(i + 1).padStart(2, '0')}`;
      if (!von) von = k;
      bis = k;
    });
  }
  return von && bis ? { von, bis } : null;
}

function datumText(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}

/**
 * HGT 20/12 eines Zeitraums (von/bis als UTC-Tagesbeginn, beide inklusiv) aus den Monatswerten der Station.
 * Teilmonate werden anteilig nach Tagen genähert.
 */
export function hgtFuerZeitraum(stationKey: string, vonMs: number, bisMs: number, daten: HgtDaten): HgtZeitraum {
  const monate: HgtMonat[] = [];
  const fehlend: string[] = [];
  if (!(bisMs >= vonMs) || !daten.stationen[stationKey]) return { wert: null, monate, teilmonate: 0, fehlend: ['station'] };
  let cursor = vonMs;
  let summe = 0;
  let teilmonate = 0;
  while (cursor <= bisMs) {
    const d = new Date(cursor);
    const jahr = d.getUTCFullYear();
    const monat = d.getUTCMonth() + 1;
    const n = tageImMonat(jahr, monat);
    const monatsEndeMs = Date.UTC(jahr, monat - 1, n);
    const endeMs = Math.min(monatsEndeMs, bisMs);
    const tage = tageInklusiv(cursor, endeMs);
    const hgtMonat = monatsWert(stationKey, jahr, monat, daten);
    const voll = tage === n;
    const hgt = hgtMonat === null ? null : voll ? hgtMonat : (hgtMonat * tage) / n;
    if (!voll) teilmonate++;
    if (hgt === null) fehlend.push(`${jahr}-${String(monat).padStart(2, '0')}`);
    else summe += hgt;
    monate.push({ jahr, monat, tage, tageImMonat: n, hgtMonat, hgt });
    cursor = endeMs + TAG_MS;
  }
  if (fehlend.length) return { wert: null, monate, teilmonate, fehlend };
  const st = daten.stationen[stationKey]!;
  const wert = tabelle(
    Math.round(summe),
    'Kd',
    `HGT 20/12 Station ${st.name}, ${datumText(vonMs)}–${datumText(bisMs)}: ${fmt(summe, 0)} Kd aus ${monate.length} Monatswerten${teilmonate ? ` (${teilmonate} Teilmonat${teilmonate > 1 ? 'e' : ''} anteilig nach Tagen genähert)` : ''}`,
    Q_HGT,
    { stufe: teilmonate ? 'teilmonate' : 'monate', ...(teilmonate ? { unsicherheit: 5 } : {}) },
  );
  return { wert, monate, teilmonate, fehlend };
}

/**
 * Jahresreferenz für die Hochrechnung: mittlere Jahres-HGT der `n` Kalenderjahre, die am Tag `bisMs` enden
 * (z. B. n = 1: die 365/366 Tage bis `bis`). null, wenn Monate fehlen.
 */
export function hgtJahresreferenz(stationKey: string, bisMs: number, n: number, daten: HgtDaten): Wert | null {
  const d = new Date(bisMs + TAG_MS);
  const vonMs = Date.UTC(d.getUTCFullYear() - n, d.getUTCMonth(), d.getUTCDate());
  const r = hgtFuerZeitraum(stationKey, vonMs, bisMs, daten);
  if (!r.wert) return null;
  const st = daten.stationen[stationKey]!;
  const mittel = r.wert.wert / n;
  return tabelle(Math.round(mittel), 'Kd', `Jahres-HGT Station ${st.name}: ${n === 1 ? `12 Monate bis ${datumText(bisMs)}` : `Mittel der ${n} Jahre bis ${datumText(bisMs)}`} = ${fmt(mittel, 0)} Kd`, Q_HGT, { stufe: r.teilmonate ? 'teilmonate' : 'monate' });
}

/** Anzahl Referenzjahre für einen Zeitraum von `tage` Tagen (1 bis 366 Tage → 1, bis 732 → 2 …). */
export function referenzJahre(tage: number): number {
  return Math.max(1, Math.ceil(tage / 366));
}
