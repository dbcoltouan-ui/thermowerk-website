/**
 * Cloud-Anbindung (Session 10): Schnittstelle und Umsetzung über die Pages Functions
 * `/api/heizlast-auth` (Anmeldung) und `/api/heizlast-projekte` (Projekte in D1).
 *
 *  - Jede Antwort wird in eine eindeutige Art übersetzt (offline, abgemeldet, nicht gefunden, abgelehnt,
 *    Serverfehler, Konflikt) — die Projektverwaltung entscheidet daraus Status und Rückfragen.
 *  - Der State geht unverändert als JSON zum Server; der Server rechnet und migriert nicht. Laden geht immer
 *    durch `hydrateState` (in der Projektverwaltung, ein Ladepfad).
 *  - Optimistisches Locking: Speichern schickt die zuletzt bekannte Version (`basisVersion`, null = neu);
 *    ist der Server-Stand neuer, kommt er mit der Antwort zurück (409 → Konflikt).
 */
import type { Methode } from './schema';

export type CloudStatus = 'aus' | 'pruefen' | 'angemeldet' | 'abgemeldet' | 'offline' | 'fehler';

/** Kopf eines Cloud-Projekts (Liste ohne State). `version` = Versionsmarke des Servers (ISO-Zeit). */
export interface CloudEintrag {
  id: string;
  name: string;
  methode: Methode | null;
  schemaVersion: number;
  qhW: number | null;
  qhlW: number | null;
  erstellt: string;
  version: string;
}

export type CloudFehlerArt = 'offline' | 'abgemeldet' | 'nichtGefunden' | 'abgelehnt' | 'server';
export interface CloudFehler {
  ok: false;
  art: CloudFehlerArt;
  text: string;
}
export interface CloudKonflikt {
  ok: false;
  art: 'konflikt';
  text: string;
  server: CloudEintrag & { stateJson: string };
}
export type CloudAnmeldung = { ok: true } | { ok: false; art: 'falsch' | 'gesperrt' | 'offline' | 'server'; text: string; wartenS?: number };
export interface Kennzahlen {
  qhW: number | null;
  qhlW: number | null;
}

/** Schnittstelle für den Cloud-Sync (Tests: eigene Umsetzung oder dieselbe über einen Test-Server). */
export interface CloudSchnittstelle {
  pruefen(): Promise<{ status: 'angemeldet' | 'abgemeldet' | 'offline' | 'fehler'; text?: string }>;
  anmelden(passwort: string): Promise<CloudAnmeldung>;
  abmelden(): Promise<{ ok: true } | CloudFehler>;
  liste(): Promise<{ ok: true; eintraege: CloudEintrag[] } | CloudFehler>;
  laden(id: string): Promise<{ ok: true; eintrag: CloudEintrag; stateJson: string } | CloudFehler>;
  speichern(id: string, state: unknown, basisVersion: string | null, kennzahlen: Kennzahlen): Promise<{ ok: true; version: string } | CloudKonflikt | CloudFehler>;
  loeschen(id: string, version: string | null): Promise<{ ok: true } | CloudKonflikt | CloudFehler>;
}

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const TEXT_OFFLINE = 'Keine Verbindung — gespeichert wird nur auf diesem Gerät.';
const TEXT_ABGEMELDET = 'Nicht angemeldet.';

type Antwort = { status: number; daten: Record<string, unknown> | null } | { offline: true };

const istObjekt = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (d: Record<string, unknown> | null, ersatz: string): string => {
  const t = d?.fehler ?? d?.error;
  return typeof t === 'string' && t ? t : ersatz;
};

function eintragAus(d: unknown): CloudEintrag | null {
  if (!istObjekt(d) || typeof d.id !== 'string' || typeof d.version !== 'string') return null;
  const zahl = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    id: d.id,
    name: typeof d.name === 'string' ? d.name : '',
    methode: d.methode === 'fws' || d.methode === 'raumweise' ? d.methode : null,
    schemaVersion: typeof d.schemaVersion === 'number' ? d.schemaVersion : 0,
    qhW: zahl(d.qhW),
    qhlW: zahl(d.qhlW),
    erstellt: typeof d.erstellt === 'string' ? d.erstellt : d.version,
    version: d.version,
  };
}

function fehlerAus(a: { status: number; daten: Record<string, unknown> | null }): CloudFehler {
  if (a.status === 401) return { ok: false, art: 'abgemeldet', text: 'Anmeldung abgelaufen — bitte neu anmelden.' };
  if (a.status === 404) return { ok: false, art: 'nichtGefunden', text: text(a.daten, 'Projekt nicht in der Cloud gefunden.') };
  if (a.status >= 400 && a.status < 500) return { ok: false, art: 'abgelehnt', text: text(a.daten, `Vom Server abgelehnt (HTTP ${a.status}).`) };
  return { ok: false, art: 'server', text: a.daten ? `Cloud-Fehler: ${text(a.daten, `HTTP ${a.status}`)}` : `Cloud nicht erreichbar (HTTP ${a.status}).` };
}

const OFFLINE: CloudFehler = { ok: false, art: 'offline', text: TEXT_OFFLINE };

function konfliktAus(d: Record<string, unknown> | null): CloudKonflikt | null {
  const p = istObjekt(d?.konflikt) ? d.konflikt.projekt : null;
  const e = eintragAus(p);
  if (!e || !istObjekt(p) || typeof p.stateJson !== 'string') return null;
  return { ok: false, art: 'konflikt', text: text(d, 'Der Server-Stand ist neuer.'), server: { ...e, stateJson: p.stateJson } };
}

/** Umsetzung über `fetch` (Browser: gleiche Herkunft, Cookie automatisch). `basis` = Präfix der API-Pfade. */
export function erstelleCloud(o: { fetch?: FetchFn; basis?: string; online?: () => boolean } = {}): CloudSchnittstelle {
  const holen: FetchFn = o.fetch ?? ((u, i) => globalThis.fetch(u, i));
  const basis = o.basis ?? '';
  const online = o.online ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));

  async function anfrage(pfad: string, init: RequestInit = {}): Promise<Antwort> {
    if (!online()) return { offline: true };
    let r: Response;
    try {
      r = await holen(basis + pfad, { credentials: 'same-origin', cache: 'no-store', ...init });
    } catch {
      return { offline: true };
    }
    let daten: Record<string, unknown> | null = null;
    if ((r.headers.get('Content-Type') || '').includes('application/json')) {
      try {
        const d: unknown = await r.json();
        daten = istObjekt(d) ? d : null;
      } catch {
        daten = null;
      }
    }
    return { status: r.status, daten };
  }
  const jsonInit = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const projektPfad = (id: string, extra = '') => `/api/heizlast-projekte?id=${encodeURIComponent(id)}${extra}`;

  return {
    async pruefen() {
      const a = await anfrage('/api/heizlast-auth');
      if ('offline' in a) return { status: 'offline', text: TEXT_OFFLINE };
      if (a.status === 200 && a.daten && typeof a.daten.authed === 'boolean') return a.daten.authed ? { status: 'angemeldet' } : { status: 'abgemeldet', text: TEXT_ABGEMELDET };
      return { status: 'fehler', text: a.daten ? `Cloud-Fehler: ${text(a.daten, `HTTP ${a.status}`)}` : `Cloud nicht erreichbar (HTTP ${a.status}).` };
    },
    async anmelden(passwort) {
      const a = await anfrage('/api/heizlast-auth', jsonInit('POST', { password: passwort }));
      if ('offline' in a) return { ok: false, art: 'offline', text: TEXT_OFFLINE };
      if (a.status === 200 && a.daten?.success === true) return { ok: true };
      if (a.status === 401) return { ok: false, art: 'falsch', text: 'Falsches Passwort.' };
      if (a.status === 429) {
        const w = a.daten?.wartenS;
        return { ok: false, art: 'gesperrt', text: text(a.daten, 'Zu viele Fehlversuche — bitte später erneut versuchen.'), ...(typeof w === 'number' ? { wartenS: w } : {}) };
      }
      return { ok: false, art: 'server', text: fehlerAus(a).text };
    },
    async abmelden() {
      const a = await anfrage('/api/heizlast-auth', { method: 'DELETE' });
      if ('offline' in a) return OFFLINE;
      return a.status === 200 ? { ok: true } : fehlerAus(a);
    },
    async liste() {
      const a = await anfrage('/api/heizlast-projekte');
      if ('offline' in a) return OFFLINE;
      if (a.status !== 200 || !Array.isArray(a.daten?.projekte)) return fehlerAus(a);
      return { ok: true, eintraege: (a.daten.projekte as unknown[]).map(eintragAus).filter((e): e is CloudEintrag => e !== null) };
    },
    async laden(id) {
      const a = await anfrage(projektPfad(id));
      if ('offline' in a) return OFFLINE;
      const p = a.daten?.projekt;
      const e = eintragAus(p);
      if (a.status !== 200 || !e || !istObjekt(p) || typeof p.stateJson !== 'string') return fehlerAus(a);
      return { ok: true, eintrag: e, stateJson: p.stateJson };
    },
    async speichern(id, state, basisVersion, k) {
      const a = await anfrage(projektPfad(id), jsonInit('PUT', { stateJson: JSON.stringify(state), basisVersion, qhW: k.qhW, qhlW: k.qhlW }));
      if ('offline' in a) return OFFLINE;
      if ((a.status === 200 || a.status === 201) && typeof a.daten?.version === 'string') return { ok: true, version: a.daten.version };
      if (a.status === 409) return konfliktAus(a.daten) ?? fehlerAus(a);
      return fehlerAus(a);
    },
    async loeschen(id, version) {
      const a = await anfrage(projektPfad(id, version ? `&version=${encodeURIComponent(version)}` : ''), { method: 'DELETE' });
      if ('offline' in a) return OFFLINE;
      if (a.status === 200) return { ok: true };
      if (a.status === 409) return konfliktAus(a.daten) ?? fehlerAus(a);
      return fehlerAus(a);
    },
  };
}
