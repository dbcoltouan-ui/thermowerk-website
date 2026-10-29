/**
 * Herkunftsmodell (KONTEXT §2 «Herkunftsmodell»).
 *
 * Jeder berechnete oder ergänzte Wert trägt seine Herkunft, eine Klartext-Begründung
 * und optional eine Unsicherheit. `Ergebnis.annahmen[]` sammelt alle Nicht-Eingaben;
 * der Bericht druckt sie im Kapitel «Annahmen & Unsicherheiten».
 *
 * Session 1 legte den Typ fest; Session 3 ergänzt die Herkunft `berechnet` (Wert aus einer
 * Formel über andere Werte — seine Annahmen sind die nicht eingegebenen Eingangswerte, nicht
 * er selbst), das optionale `band` (min/max in der Einheit des Werts) sowie Konstruktoren.
 *
 * Einheiten im Kern: W (Leistung), kWh/a bzw. kWh/d (Energie), °C und K, l, h, m², %.
 * Formatierung (kW, Tausendertrennung) ist Sache der UI.
 */

export type Herkunft = 'eingabe' | 'messung' | 'tabelle' | 'schaetzung' | 'fallback' | 'override' | 'berechnet';

export interface Wert<T = number> {
  wert: T;
  /** SI-nah: intern W, kWh, °C, K, m², l, h — Formatierung nur in der UI. */
  einheit: string;
  herkunft: Herkunft;
  /** Fallback-Stufe, z. B. 'epoche' | 'bauweise' | 'daemmdicke' | 'preset'. */
  stufe?: string;
  /** Unsicherheit in ±% (relativ). */
  unsicherheit?: number;
  /** Spanne min/max in der Einheit des Werts (z. B. Bauperioden-Band, η-Band). */
  band?: [number, number];
  /** Klartext für UI-Chip und Bericht, z. B. «geschätzt aus Baujahr 1965, Backstein 30 cm ungedämmt». */
  begruendung: string;
  /** Norm/Seite/Tabelle oder Datenblatt-URL + Datum. */
  quelle?: string;
}

export interface WertOptionen {
  stufe?: string | undefined;
  unsicherheit?: number | undefined;
  band?: [number, number] | undefined;
  quelle?: string | undefined;
}

/** Hinweis an den Nutzer (Validierung, Plausibilität). `fehler` bedeutet: kein Ergebnis für diesen Teil. */
export interface Hinweis {
  stufe: 'info' | 'warnung' | 'fehler';
  /** Stabiler Schlüssel für Tests und Sprungziele, z. B. 'verbrauch.ueberlappung'. */
  code: string;
  text: string;
  /** Pfad des betroffenen Eingabefelds, falls zutreffend. */
  pfad?: string;
}

function mitOptionen<T>(w: Wert<T>, o?: WertOptionen): Wert<T> {
  if (!o) return w;
  if (o.stufe !== undefined) w.stufe = o.stufe;
  if (o.unsicherheit !== undefined) w.unsicherheit = o.unsicherheit;
  if (o.band !== undefined) w.band = o.band;
  if (o.quelle !== undefined) w.quelle = o.quelle;
  return w;
}

/** Hilfskonstruktor für direkte Eingaben (keine Annahme). */
export function eingabe<T = number>(wert: T, einheit: string, begruendung = 'Eingabe'): Wert<T> {
  return { wert, einheit, herkunft: 'eingabe', begruendung };
}

/** Messwert (Zähler, Rechnung) — keine Annahme. */
export function messung<T = number>(wert: T, einheit: string, begruendung = 'Messung'): Wert<T> {
  return { wert, einheit, herkunft: 'messung', begruendung };
}

/** Wert aus einer Norm-/Kurstabelle (Annahme: der Tabellenwert passt zum Objekt). */
export function tabelle<T = number>(wert: T, einheit: string, begruendung: string, quelle: string, o?: WertOptionen): Wert<T> {
  return mitOptionen({ wert, einheit, herkunft: 'tabelle', begruendung, quelle }, o);
}

/** Schätzung (Regel, Faustwert, Diagramm-Ablesung). */
export function schaetzung<T = number>(wert: T, einheit: string, begruendung: string, o?: WertOptionen): Wert<T> {
  return mitOptionen({ wert, einheit, herkunft: 'schaetzung', begruendung }, o);
}

/** Fallback, weil eine Angabe fehlt (schwächste Stufe). */
export function fallback<T = number>(wert: T, einheit: string, begruendung: string, o?: WertOptionen): Wert<T> {
  return mitOptionen({ wert, einheit, herkunft: 'fallback', begruendung }, o);
}

/** Vom Nutzer bewusst überschriebener Wert. */
export function override<T = number>(wert: T, einheit: string, begruendung = 'manuell überschrieben'): Wert<T> {
  return { wert, einheit, herkunft: 'override', begruendung };
}

/**
 * Wert aus einer Formel. `abhaengig` sind die Eingangswerte; ohne explizite Unsicherheit wird die
 * relative Unsicherheit als Quadratsumme der Eingangs-Unsicherheiten fortgepflanzt (gilt exakt für
 * Produkte/Quotienten, für Summen als Näherung — dort explizit übergeben).
 */
export function berechnet<T = number>(wert: T, einheit: string, begruendung: string, abhaengig: ReadonlyArray<Wert<unknown> | null | undefined> = [], o?: WertOptionen): Wert<T> {
  const w: Wert<T> = { wert, einheit, herkunft: 'berechnet', begruendung };
  const u = o?.unsicherheit ?? kombiniereUnsicherheit(abhaengig);
  if (u !== undefined) w.unsicherheit = u;
  if (o?.stufe !== undefined) w.stufe = o.stufe;
  if (o?.band !== undefined) w.band = o.band;
  if (o?.quelle !== undefined) w.quelle = o.quelle;
  return w;
}

/** Quadratsumme relativer Unsicherheiten (±%). `undefined`, wenn kein Eingangswert eine trägt. */
export function kombiniereUnsicherheit(werte: ReadonlyArray<Wert<unknown> | null | undefined>): number | undefined {
  let summe = 0;
  let n = 0;
  for (const w of werte) {
    if (w?.unsicherheit !== undefined && w.unsicherheit > 0) {
      summe += w.unsicherheit * w.unsicherheit;
      n++;
    }
  }
  return n ? Math.round(Math.sqrt(summe) * 10) / 10 : undefined;
}

/**
 * Relative Unsicherheit einer Summe aus Teilwerten mit eigener Unsicherheit (Quadratsumme der absoluten
 * Beiträge, bezogen auf die Summe). Für Werte in derselben Einheit.
 */
export function unsicherheitSumme(werte: ReadonlyArray<Wert<number> | null | undefined>): number | undefined {
  let summe = 0;
  let absQuadrat = 0;
  let n = 0;
  for (const w of werte) {
    if (!w) continue;
    summe += w.wert;
    if (w.unsicherheit !== undefined && w.unsicherheit > 0) {
      const abs = Math.abs(w.wert) * w.unsicherheit / 100;
      absQuadrat += abs * abs;
      n++;
    }
  }
  if (!n || summe === 0) return undefined;
  return Math.round((Math.sqrt(absQuadrat) / Math.abs(summe)) * 1000) / 10;
}

/** Ein Wert zählt als Annahme, wenn er nicht direkt eingegeben, gemessen oder nur berechnet wurde. */
export function istAnnahme(w: Wert<unknown>): boolean {
  return w.herkunft !== 'eingabe' && w.herkunft !== 'messung' && w.herkunft !== 'berechnet';
}

/** Sammelt alle Annahmen aus einer Liste von Werten (null/undefined werden übersprungen). */
export function sammleAnnahmen(werte: ReadonlyArray<Wert<unknown> | null | undefined>): Wert<unknown>[] {
  const out: Wert<unknown>[] = [];
  for (const w of werte) if (w && istAnnahme(w)) out.push(w);
  return out;
}

/** Zahl für Begründungstexte: Schweizer Schreibweise (Tausender mit Apostroph), max. `dez` Nachkommastellen. */
export function fmt(n: number, dez = 2): string {
  if (!Number.isFinite(n)) return '—';
  const gerundet = Math.round(n * 10 ** dez) / 10 ** dez;
  const [ganz, rest] = Math.abs(gerundet).toFixed(dez).split('.');
  const ganzMitApostroph = (ganz ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const restOhneNullen = (rest ?? '').replace(/0+$/, '');
  return (gerundet < 0 ? '−' : '') + ganzMitApostroph + (restOhneNullen ? '.' + restOhneNullen : '');
}
