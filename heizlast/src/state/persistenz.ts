/**
 * Lokale Persistenz (Session 6; UX-20/21, BUILD-05/09/10): Entwurf-Slot + Projektliste im localStorage,
 * Autosave entprellt (≥ 1 s), Fehler sichtbar (Quota, gesperrter Speicher), «Neu»/«Laden» mit Rückfrage
 * bei ungespeicherten Änderungen; Cloud-Sync über `CloudSchnittstelle` (Session 10, `cloud.ts`): Speichern lädt
 * angemeldet im Hintergrund hoch (Versionsprüfung → Konflikt-Dialog «überschreiben / Kopie»), die Liste zeigt
 * lokale und Cloud-Projekte mit Abgleich-Zustand, fehlende Cloud-Einträge werden nur markiert.
 *
 *  - Entwurf: der aktuelle Arbeitsstand, automatisch gesichert (überlebt Neuladen). Enthält den Hash des
 *    zuletzt ausdrücklich gespeicherten Stands → «ungespeichert» bleibt nach dem Neuladen korrekt.
 *  - Projektliste: ausdrücklich gespeicherte Projekte (Name = `projekt.name`, eine Quelle, FLOW-14) mit
 *    KPI aus dem massgebenden Ergebnis (UX-26).
 *  - Jeder Ladevorgang geht durch `hydrateState` (ein Ladepfad, FLOW-04).
 *  - Lokale Einträge werden nie automatisch gelöscht (BUILD-09).
 *
 * Schlüssel bewusst neu (`thermowerk-heizlast-v2-*`): das alte Tool bleibt bis zum Go-Live unberührt.
 */
import type { ReadonlySignal, Signal } from '@preact/signals';
import { computed, effect, signal } from '@preact/signals';
import type { Ergebnis } from '../kern/berechne';
import type { HydrateErgebnis } from './hydrate';
import { hydrateState } from './hydrate';
import type { CloudAnmeldung, CloudEintrag, CloudFehler, CloudSchnittstelle, CloudStatus } from './cloud';
import type { Methode, State } from './schema';
import { neuerState } from './schema';
import type { Store } from './store';
import { SCHEMA_VERSION } from './version';

export const SCHLUESSEL = {
  entwurf: 'thermowerk-heizlast-v2-entwurf',
  projekte: 'thermowerk-heizlast-v2-projekte',
} as const;

/** Mindestverzögerung des Autosave [ms] (BUILD-05: nicht bei jedem Tastendruck). */
export const AUTOSAVE_MIN_MS = 1000;

/** Teilmenge der Web-Storage-API (localStorage oder Test-Mock). */
export interface Speicher {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export type SpeicherFehlerArt = 'quota' | 'gesperrt' | 'unbekannt';
export type SpeicherErgebnis = { ok: true } | { ok: false; art: SpeicherFehlerArt; text: string };

export interface ProjektEintrag {
  id: string;
  name: string;
  methode: Methode | null;
  geaendert: string;
  gespeichert: string;
  /** Q_h und Q_hl [W] aus dem massgebenden Ergebnis (Liste zeigt dieselben Werte wie der Bericht). */
  qhW: number | null;
  qhlW: number | null;
  /** Versionsmarke der Cloud beim letzten Abgleich (optimistisches Locking, Session 10). */
  cloudVersion?: string;
  /** Hash des Stands beim letzten Abgleich — weicht der gespeicherte Stand ab, ist er lokal neuer. */
  cloudHash?: string;
  /** Lokal vorhanden, in der Cloud nicht mehr — nur markiert, nie automatisch gelöscht (BUILD-09). */
  nichtMehrInCloud?: boolean;
  state: unknown;
}

interface EntwurfPayload {
  format: 1;
  state: State;
  /** Hash des zuletzt gespeicherten Stands (null = nie gespeichert). */
  basisHash: string | null;
}

function fehlerArt(e: unknown): SpeicherFehlerArt {
  const name = (e as { name?: string } | null)?.name ?? '';
  const code = (e as { code?: number } | null)?.code;
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) return 'quota';
  if (name === 'SecurityError') return 'gesperrt';
  return 'unbekannt';
}

const FEHLERTEXT: Record<SpeicherFehlerArt, string> = {
  quota: 'Browser-Speicher ist voll — nicht gespeichert. Bitte alte Projekte löschen oder als Datei exportieren.',
  gesperrt: 'Browser-Speicher ist gesperrt (privates Fenster?) — nicht gespeichert. Bitte als Datei exportieren.',
  unbekannt: 'Speichern fehlgeschlagen — bitte als Datei exportieren.',
};

/** Schreibt und meldet Fehler, statt sie zu verschlucken (UX-20). */
export function schreibe(sp: Speicher, k: string, v: string): SpeicherErgebnis {
  try {
    sp.setItem(k, v);
    return { ok: true };
  } catch (e) {
    const art = fehlerArt(e);
    return { ok: false, art, text: FEHLERTEXT[art] };
  }
}

/** Vergleichsform ohne Zeitstempel (geaendert ändert sich bei jeder Eingabe). */
function vergleichsform(s: State): string {
  return JSON.stringify({ ...s, meta: { ...s.meta, geaendert: '' } });
}

/** FNV-1a (32 bit) — genügt zum Erkennen von Änderungen. */
export function stateHash(s: State): string {
  const t = vergleichsform(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0') + t.length.toString(16);
}

/** Neues Projekt ohne jede Eingabe (Metadaten zählen nicht). */
export function istLeer(s: State): boolean {
  const ohneMeta = (x: State) => JSON.stringify({ ...x, meta: null });
  return ohneMeta(s) === ohneMeta(neuerState({ id: s.meta.id, jetzt: s.meta.erstellt }));
}

/* --- Entwurf ---------------------------------------------------------------------------------- */

export function speichereEntwurf(sp: Speicher, state: State, basisHash: string | null): SpeicherErgebnis {
  const p: EntwurfPayload = { format: 1, state, basisHash };
  return schreibe(sp, SCHLUESSEL.entwurf, JSON.stringify(p));
}

export function ladeEntwurf(sp: Speicher, k: { id: string; jetzt: string }): { hydrat: HydrateErgebnis; basisHash: string | null } | null {
  let roh: string | null;
  try {
    roh = sp.getItem(SCHLUESSEL.entwurf);
  } catch {
    return null;
  }
  if (!roh) return null;
  let p: unknown;
  try {
    p = JSON.parse(roh);
  } catch {
    return { hydrat: { ok: false, grund: 'unlesbar', text: 'Entwurf ist beschädigt.' }, basisHash: null };
  }
  const payload = p as Partial<EntwurfPayload>;
  if (payload && payload.format === 1 && 'state' in payload) return { hydrat: hydrateState(payload.state, k), basisHash: typeof payload.basisHash === 'string' ? payload.basisHash : null };
  // Rohform (z. B. Session-1-Shell oder direkter State)
  return { hydrat: hydrateState(p, k), basisHash: null };
}

/* --- Projektliste ----------------------------------------------------------------------------- */

export function projektListe(sp: Speicher): ProjektEintrag[] {
  try {
    const roh = sp.getItem(SCHLUESSEL.projekte);
    const l: unknown = roh ? JSON.parse(roh) : [];
    return Array.isArray(l) ? (l.filter((e) => e && typeof e === 'object' && typeof (e as ProjektEintrag).id === 'string') as ProjektEintrag[]) : [];
  } catch {
    return [];
  }
}

export function projektSpeichern(sp: Speicher, state: State, ergebnis: Ergebnis | null, jetzt: string): SpeicherErgebnis {
  const liste = projektListe(sp);
  const alt = liste.find((e) => e.id === state.meta.id);
  const eintrag: ProjektEintrag = {
    // Abgleich-Marken bleiben: der Unterschied zum Cloud-Stand zeigt sich am Hash (lokal neuer).
    ...(alt?.cloudVersion ? { cloudVersion: alt.cloudVersion } : {}),
    ...(alt?.cloudHash ? { cloudHash: alt.cloudHash } : {}),
    ...(alt?.nichtMehrInCloud ? { nichtMehrInCloud: true } : {}),
    id: state.meta.id,
    name: state.projekt.name.trim() || 'Unbenanntes Projekt',
    methode: state.methode,
    geaendert: state.meta.geaendert,
    gespeichert: jetzt,
    qhW: ergebnis?.zuschlaege.qh?.wert ?? null,
    qhlW: ergebnis?.heizlast.massgebend.wert?.wert ?? null,
    state,
  };
  const neu = [eintrag, ...liste.filter((e) => e.id !== state.meta.id)];
  return schreibe(sp, SCHLUESSEL.projekte, JSON.stringify(neu));
}

export function projektLaden(sp: Speicher, id: string, k: { id: string; jetzt: string }): HydrateErgebnis {
  const e = projektListe(sp).find((x) => x.id === id);
  if (!e) return { ok: false, grund: 'unlesbar', text: `Projekt «${id}» nicht gefunden.` };
  return hydrateState(e.state, k);
}

export function projektLoeschen(sp: Speicher, id: string): SpeicherErgebnis {
  return schreibe(sp, SCHLUESSEL.projekte, JSON.stringify(projektListe(sp).filter((e) => e.id !== id)));
}

/* --- Autosave --------------------------------------------------------------------------------- */

export interface Timer {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
}

/** Entprellter Autosave: speichert frühestens `verzoegerungMs` (≥ 1 s) nach der letzten Änderung. */
export function erstelleAutosave(o: { speichere: () => SpeicherErgebnis; verzoegerungMs?: number; timer?: Timer; beiErgebnis?: (r: SpeicherErgebnis) => void }) {
  const ms = Math.max(AUTOSAVE_MIN_MS, o.verzoegerungMs ?? AUTOSAVE_MIN_MS);
  const timer: Timer = o.timer ?? { setTimeout: (fn, t) => globalThis.setTimeout(fn, t), clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>) };
  let handle: unknown = null;
  const sofort = (): SpeicherErgebnis | null => {
    if (handle === null) return null;
    timer.clearTimeout(handle);
    handle = null;
    const r = o.speichere();
    o.beiErgebnis?.(r);
    return r;
  };
  return {
    anstossen() {
      if (handle !== null) timer.clearTimeout(handle);
      handle = timer.setTimeout(() => {
        handle = null;
        const r = o.speichere();
        o.beiErgebnis?.(r);
      }, ms);
    },
    /** Ausstehende Sicherung sofort ausführen (z. B. vor dem Schliessen). */
    sofort,
    abbrechen() {
      if (handle !== null) timer.clearTimeout(handle);
      handle = null;
    },
    get ausstehend() {
      return handle !== null;
    },
  };
}

/* --- Cloud-Abgleich (Session 10) -------------------------------------------------------------- */

/** Abgleich eines Projekts mit der Cloud (Projektliste, Rückfragen). */
export type CloudZustand = 'synchron' | 'lokalNeuer' | 'serverNeuer' | 'nurLokal' | 'nurCloud' | 'nichtMehrInCloud';

/** Eine Zeile der Projektliste: lokale Einträge und Projekte, die nur in der Cloud liegen. */
export interface ProjektZeile {
  id: string;
  name: string;
  methode: Methode | null;
  qhW: number | null;
  /** Zuletzt gespeichert (lokal) bzw. Version in der Cloud. */
  datum: string;
  lokal: boolean;
  /** null = ohne Cloud-Bezug (Cloud nie abgeglichen). */
  cloud: CloudZustand | null;
}

/** Anzeige im Konflikt-Dialog «Server neuer – überschreiben / Kopie». */
export interface KonfliktAnzeige {
  id: string;
  name: string;
  serverName: string;
  serverGeaendert: string;
}

/** Zustand der Cloud-Anzeige in der Topbar. */
export type CloudAnzeige = CloudStatus | 'abgleich' | 'ausstehend' | 'konflikt';

export function eintragHash(e: ProjektEintrag): string {
  return stateHash(e.state as State);
}

/** Cloud-Zustand je Zeile aus lokaler Liste und zuletzt geladener Cloud-Liste (rein). */
export function projektZeilen(lokal: ProjektEintrag[], cloud: CloudEintrag[] | null): ProjektZeile[] {
  const nachId = new Map((cloud ?? []).map((c) => [c.id, c]));
  const zeilen: ProjektZeile[] = lokal.map((e) => {
    let z: CloudZustand | null = null;
    if (e.nichtMehrInCloud) z = 'nichtMehrInCloud';
    else if (e.cloudVersion) {
      const c = nachId.get(e.id);
      z = c && c.version > e.cloudVersion ? 'serverNeuer' : eintragHash(e) === e.cloudHash ? 'synchron' : 'lokalNeuer';
    } else if (cloud) z = 'nurLokal';
    return { id: e.id, name: e.name, methode: e.methode, qhW: e.qhW, datum: e.gespeichert, lokal: true, cloud: z };
  });
  const lokaleIds = new Set(lokal.map((e) => e.id));
  for (const c of cloud ?? []) if (!lokaleIds.has(c.id)) zeilen.push({ id: c.id, name: c.name, methode: c.methode, qhW: c.qhW, datum: c.version, lokal: false, cloud: 'nurCloud' });
  return zeilen.sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));
}

/** Drift (BUILD-09): lokale Einträge, die in der Cloud fehlen, werden markiert — nie gelöscht. */
export function driftMarkieren(lokal: ProjektEintrag[], cloud: CloudEintrag[]): { liste: ProjektEintrag[]; geaendert: boolean } {
  const ids = new Set(cloud.map((c) => c.id));
  let geaendert = false;
  const liste = lokal.map((e) => {
    if (!e.cloudVersion) return e;
    const fehlt = !ids.has(e.id);
    if (fehlt === !!e.nichtMehrInCloud) return e;
    geaendert = true;
    const { nichtMehrInCloud: _alt, ...rest } = e;
    return fehlt ? { ...rest, nichtMehrInCloud: true } : rest;
  });
  return { liste, geaendert };
}

/** Eintrag einfügen oder ersetzen (neuester oben). */
function eintragSchreiben(sp: Speicher, eintrag: ProjektEintrag): SpeicherErgebnis {
  return schreibe(sp, SCHLUESSEL.projekte, JSON.stringify([eintrag, ...projektListe(sp).filter((e) => e.id !== eintrag.id)]));
}

/** Felder eines bestehenden Eintrags ändern (Reihenfolge bleibt). */
function eintragAendern(sp: Speicher, id: string, fn: (e: ProjektEintrag) => ProjektEintrag): SpeicherErgebnis {
  return schreibe(sp, SCHLUESSEL.projekte, JSON.stringify(projektListe(sp).map((e) => (e.id === id ? fn(e) : e))));
}

/* --- Projektverwaltung (Store + Speicher + Cloud + Rückfragen) -------------------------------- */

export type SpeicherStatus = 'neu' | 'ungespeichert' | 'gespeichert' | 'fehler';

export interface Projektverwaltung {
  /** Stand weicht vom zuletzt gespeicherten ab (bzw. neues Projekt mit Eingaben). */
  ungespeichert: ReadonlySignal<boolean>;
  status: ReadonlySignal<SpeicherStatus>;
  /** Letzter Speicherfehler (Text für die UI), null wenn ok. */
  fehler: Signal<string | null>;
  /** Hinweise zum zuletzt geladenen Stand (Migration, verworfene Angaben, Ablehnung). */
  ladeMeldungen: Signal<string[]>;
  liste: Signal<ProjektEintrag[]>;
  /** Lokale und Cloud-Projekte mit Abgleich-Zustand (eine Liste, jedes Projekt einmal). */
  zeilen: ReadonlySignal<ProjektZeile[]>;
  cloudStatus: ReadonlySignal<CloudStatus>;
  /** Letzte Meldung der Cloud (Fehler, Hinweis), null wenn keine. */
  cloudText: ReadonlySignal<string | null>;
  cloudAnzeige: ReadonlySignal<CloudAnzeige>;
  /** Ältester offener Konflikt (Dialog), null wenn keiner. */
  konflikt: ReadonlySignal<KonfliktAnzeige | null>;
  starten(): void;
  stoppen(): void;
  /** Ausstehende Entwurf-Sicherung sofort schreiben (Seite wird verlassen/verborgen). */
  sichern(): void;
  /** Lokal speichern; danach (angemeldet) im Hintergrund in die Cloud. */
  speichern(): SpeicherErgebnis;
  neu(): Promise<boolean>;
  laden(id: string): Promise<boolean>;
  /** Projekt aus einer exportierten JSON-Datei (Session 9) — gleicher Ladepfad `hydrateState`, Rückfrage bei ungespeicherten Änderungen. */
  importieren(text: string): Promise<boolean>;
  /** Nur auf diesem Gerät löschen. */
  loeschen(id: string): SpeicherErgebnis;
  /** Auf diesem Gerät und in der Cloud löschen (Version wird geprüft: neuerer Server-Stand → nicht gelöscht). */
  ueberallLoeschen(id: string): Promise<{ ok: true } | { ok: false; text: string }>;
  cloudPruefen(): Promise<void>;
  /** Status prüfen, Liste holen, Drift markieren, ausstehende Stände hochladen. */
  cloudAbgleichen(): Promise<void>;
  /** Browser meldet «offline». */
  cloudOffline(): void;
  anmelden(passwort: string): Promise<CloudAnmeldung>;
  abmelden(): Promise<void>;
  konfliktLoesen(wahl: 'ueberschreiben' | 'kopie' | 'spaeter'): Promise<void>;
  /** Wartet auf laufende Cloud-Vorgänge (Tests, vor dem Schliessen). */
  cloudFertig(): Promise<void>;
}

interface KonfliktIntern {
  id: string;
  server: CloudEintrag & { stateJson: string };
}

export function erstelleProjektverwaltung(o: {
  store: Store;
  speicher: Speicher;
  /** Rückfrage bei ungespeicherten Änderungen; true = verwerfen und fortfahren. */
  bestaetigen: (frage: string) => boolean | Promise<boolean>;
  /** Cloud-Anbindung (Browser: `erstelleCloud()`); ohne = nur lokal. */
  cloud?: CloudSchnittstelle;
  timer?: Timer;
  autosaveMs?: number;
}): Projektverwaltung {
  const { store, speicher, cloud } = o;
  const basisHash = signal<string | null>(null);
  const fehler = signal<string | null>(null);
  const ladeMeldungen = signal<string[]>([]);
  const liste = signal<ProjektEintrag[]>(projektListe(speicher));
  const cloudStatus = signal<CloudStatus>(cloud ? 'pruefen' : 'aus');
  const cloudText = signal<string | null>(null);
  const cloudListe = signal<CloudEintrag[] | null>(null);
  const konflikte = signal<KonfliktIntern[]>([]);
  const laufend = signal(0);
  const aktuellerHash = computed(() => stateHash(store.state.value));
  /** «neu» ohne Eingaben gilt nicht als ungespeichert. */
  const ungespeichert = computed(() => (basisHash.value === null ? !istLeer(store.state.value) : aktuellerHash.value !== basisHash.value));
  const status = computed<SpeicherStatus>(() => (fehler.value ? 'fehler' : basisHash.value === null && !ungespeichert.value ? 'neu' : ungespeichert.value ? 'ungespeichert' : 'gespeichert'));
  const zeilen = computed(() => projektZeilen(liste.value, cloudListe.value));
  const konflikt = computed<KonfliktAnzeige | null>(() => {
    const k = konflikte.value[0];
    if (!k) return null;
    const lokal = liste.value.find((e) => e.id === k.id);
    return { id: k.id, name: lokal?.name ?? k.server.name, serverName: k.server.name || 'Unbenanntes Projekt', serverGeaendert: k.server.version };
  });
  const cloudAnzeige = computed<CloudAnzeige>(() => {
    const st = cloudStatus.value;
    if (st !== 'angemeldet') return st;
    if (konflikte.value.length) return 'konflikt';
    if (laufend.value > 0) return 'abgleich';
    return zeilen.value.some((z) => z.cloud === 'lokalNeuer' || z.cloud === 'nurLokal') ? 'ausstehend' : 'angemeldet';
  });

  const meldeErgebnis = (r: SpeicherErgebnis) => {
    fehler.value = r.ok ? null : r.text;
  };
  const listeNeu = () => {
    liste.value = projektListe(speicher);
  };
  const autosave = erstelleAutosave({
    speichere: () => speichereEntwurf(speicher, store.state.value, basisHash.value),
    ...(o.autosaveMs !== undefined ? { verzoegerungMs: o.autosaveMs } : {}),
    ...(o.timer ? { timer: o.timer } : {}),
    beiErgebnis: meldeErgebnis,
  });
  const kontext = () => ({ id: store.neueId('p'), jetzt: store.uhr() });
  let stopp: (() => void) | null = null;

  const rueckfrage = async (text: string): Promise<boolean> => (ungespeichert.value ? await o.bestaetigen(text) : true);

  /* Cloud: laufende Vorgänge nacheinander (kein paralleles Hochladen desselben Projekts). */
  let kette: Promise<unknown> = Promise.resolve();
  function nacheinander<T>(fn: () => Promise<T>): Promise<T> {
    laufend.value++;
    const p = kette.then(fn, fn);
    kette = p.then(
      () => undefined,
      () => undefined,
    );
    void p.finally(() => {
      laufend.value--;
    });
    return p;
  }

  const behandleFehler = (r: CloudFehler) => {
    cloudText.value = r.text;
    if (r.art === 'offline') cloudStatus.value = 'offline';
    else if (r.art === 'abgemeldet') {
      cloudStatus.value = 'abgemeldet';
      cloudListe.value = null;
    } else if (r.art === 'server') cloudStatus.value = 'fehler';
  };

  const cloudEintragSetzen = (e: CloudEintrag) => {
    if (cloudListe.value) cloudListe.value = [e, ...cloudListe.value.filter((c) => c.id !== e.id)];
  };

  const hochgeladen = (e: ProjektEintrag, version: string) => {
    meldeErgebnis(
      eintragAendern(speicher, e.id, (x) => {
        const { nichtMehrInCloud: _n, ...rest } = x;
        return { ...rest, cloudVersion: version, cloudHash: eintragHash(e) };
      }),
    );
    listeNeu();
    const st = e.state as Partial<State>;
    cloudEintragSetzen({
      id: e.id,
      name: e.name,
      methode: e.methode,
      schemaVersion: st.meta?.schemaVersion ?? SCHEMA_VERSION,
      qhW: e.qhW,
      qhlW: e.qhlW,
      erstellt: st.meta?.erstellt ?? version,
      version,
    });
  };

  /** Lädt den gespeicherten Stand eines Projekts hoch (mit Versionsprüfung). */
  async function hochladen(id: string, basisErzwungen?: string | null): Promise<void> {
    if (!cloud || cloudStatus.value !== 'angemeldet') return;
    const e = projektListe(speicher).find((x) => x.id === id);
    if (!e) return;
    const basis = basisErzwungen !== undefined ? basisErzwungen : e.nichtMehrInCloud ? null : (e.cloudVersion ?? null);
    let r = await cloud.speichern(id, e.state, basis, { qhW: e.qhW, qhlW: e.qhlW });
    // In der Cloud gelöscht, hier aber ausdrücklich gespeichert → neu anlegen.
    if (!r.ok && r.art === 'nichtGefunden') r = await cloud.speichern(id, e.state, null, { qhW: e.qhW, qhlW: e.qhlW });
    if (r.ok) {
      cloudText.value = null;
      hochgeladen(e, r.version);
      return;
    }
    if (r.art === 'konflikt') {
      cloudEintragSetzen(r.server);
      konflikte.value = [...konflikte.value.filter((k) => k.id !== id), { id, server: r.server }];
      return;
    }
    behandleFehler(r);
  }

  async function pruefen(): Promise<void> {
    if (!cloud) return;
    const r = await cloud.pruefen();
    cloudStatus.value = r.status;
    cloudText.value = r.status === 'angemeldet' ? null : (r.text ?? null);
    if (r.status === 'abgemeldet') cloudListe.value = null;
  }

  async function abgleichen(): Promise<void> {
    if (!cloud) return;
    await pruefen();
    if (cloudStatus.value !== 'angemeldet') return;
    const r = await cloud.liste();
    if (!r.ok) return behandleFehler(r);
    cloudListe.value = r.eintraege;
    const d = driftMarkieren(projektListe(speicher), r.eintraege);
    if (d.geaendert) {
      meldeErgebnis(schreibe(speicher, SCHLUESSEL.projekte, JSON.stringify(d.liste)));
      listeNeu();
    }
    // Ausstehende Stände (neu oder lokal geändert) hochladen; «nicht mehr in der Cloud» nur beim ausdrücklichen Speichern.
    for (const z of projektZeilen(projektListe(speicher), r.eintraege)) {
      if (z.cloud === 'nurLokal' || z.cloud === 'lokalNeuer') await hochladen(z.id);
      if (cloudStatus.value !== 'angemeldet') break;
    }
  }

  /** Übernimmt einen Server-Stand als lokalen Eintrag (Laden aus der Cloud, Kopie-Auflösung). */
  function serverStandUebernehmen(server: CloudEintrag, stateJson: string): HydrateErgebnis {
    let roh: unknown;
    try {
      roh = JSON.parse(stateJson);
    } catch {
      return { ok: false, grund: 'unlesbar', text: 'Cloud-Stand ist beschädigt.' };
    }
    const h = hydrateState(roh, kontext());
    if (!h.ok) return h;
    const alt = projektListe(speicher).find((e) => e.id === server.id);
    const eintrag: ProjektEintrag = {
      id: server.id,
      name: h.state.projekt.name.trim() || 'Unbenanntes Projekt',
      methode: h.state.methode,
      geaendert: h.state.meta.geaendert,
      gespeichert: alt?.gespeichert && alt.gespeichert > server.version ? alt.gespeichert : server.version,
      qhW: server.qhW,
      qhlW: server.qhlW,
      cloudVersion: server.version,
      cloudHash: stateHash(h.state),
      state: h.state,
    };
    meldeErgebnis(alt ? eintragAendern(speicher, server.id, () => eintrag) : eintragSchreiben(speicher, eintrag));
    listeNeu();
    cloudEintragSetzen(server);
    return h;
  }

  const ladeInStore = (h: Extract<HydrateErgebnis, { ok: true }>, extra: string[] = []) => {
    autosave.abbrechen();
    store.ersetze(h.state);
    basisHash.value = stateHash(h.state);
    ladeMeldungen.value = [...extra, ...h.protokoll, ...h.probleme];
    meldeErgebnis(speichereEntwurf(speicher, h.state, basisHash.value));
  };

  const api: Projektverwaltung = {
    ungespeichert,
    status,
    fehler,
    ladeMeldungen,
    liste,
    zeilen,
    cloudStatus,
    cloudText,
    cloudAnzeige,
    konflikt,
    starten() {
      const e = ladeEntwurf(speicher, kontext());
      if (e) {
        if (e.hydrat.ok) {
          store.ersetze(e.hydrat.state);
          basisHash.value = e.basisHash;
          ladeMeldungen.value = [...e.hydrat.protokoll, ...e.hydrat.probleme];
        } else ladeMeldungen.value = [e.hydrat.text];
      }
      let erster = true;
      stopp = effect(() => {
        void store.state.value;
        if (erster) {
          erster = false;
          return;
        }
        autosave.anstossen();
      });
      if (cloud) void nacheinander(abgleichen);
    },
    sichern() {
      autosave.sofort();
    },
    stoppen() {
      autosave.sofort();
      stopp?.();
      stopp = null;
    },
    speichern() {
      autosave.abbrechen();
      const s = store.state.value;
      const r = projektSpeichern(speicher, s, store.ergebnis.value, store.uhr());
      meldeErgebnis(r);
      if (r.ok) {
        basisHash.value = stateHash(s);
        listeNeu();
        meldeErgebnis(speichereEntwurf(speicher, s, basisHash.value));
        if (cloud && cloudStatus.value === 'angemeldet') void nacheinander(() => hochladen(s.meta.id));
      }
      return r;
    },
    async neu() {
      if (!(await rueckfrage('Ungespeicherte Änderungen verwerfen und ein neues Projekt beginnen?'))) return false;
      autosave.abbrechen();
      const s = store.neu();
      basisHash.value = null;
      ladeMeldungen.value = [];
      meldeErgebnis(speichereEntwurf(speicher, s, null));
      return true;
    },
    async laden(id) {
      if (!(await rueckfrage('Ungespeicherte Änderungen verwerfen und das gewählte Projekt laden?'))) return false;
      const lokal = projektListe(speicher).find((e) => e.id === id);
      const zeile = zeilen.value.find((z) => z.id === id);
      // Aus der Cloud: nur dort vorhanden, oder Server neuer und hier unverändert seit dem letzten Abgleich.
      const ausCloud = !!cloud && cloudStatus.value === 'angemeldet' && (!lokal || (zeile?.cloud === 'serverNeuer' && eintragHash(lokal) === lokal.cloudHash));
      if (ausCloud && cloud) {
        const r = await nacheinander(() => cloud.laden(id));
        if (r.ok) {
          const h = serverStandUebernehmen(r.eintrag, r.stateJson);
          if (!h.ok) {
            ladeMeldungen.value = [h.text];
            return false;
          }
          ladeInStore(h, lokal ? ['Neuerer Stand aus der Cloud geladen.'] : []);
          return true;
        }
        if (r.art === 'nichtGefunden' && cloudListe.value) cloudListe.value = cloudListe.value.filter((c) => c.id !== id);
        if (r.art !== 'nichtGefunden') behandleFehler(r);
        if (!lokal) {
          ladeMeldungen.value = [r.text];
          return false;
        }
        const h = projektLaden(speicher, id, kontext());
        if (!h.ok) {
          ladeMeldungen.value = [h.text];
          return false;
        }
        ladeInStore(h, [`Cloud-Stand nicht geladen (${r.text}) — Stand von diesem Gerät geöffnet.`]);
        return true;
      }
      const h = projektLaden(speicher, id, kontext());
      if (!h.ok) {
        ladeMeldungen.value = [h.text];
        return false;
      }
      ladeInStore(h);
      return true;
    },
    async importieren(text) {
      const h = hydrateState(text, kontext());
      if (!h.ok) {
        ladeMeldungen.value = [h.text];
        return false;
      }
      if (!(await rueckfrage('Ungespeicherte Änderungen verwerfen und das Projekt aus der Datei laden?'))) return false;
      autosave.abbrechen();
      store.ersetze(h.state);
      // Wie ein neu erfasstes Projekt: erst «Speichern» legt es in der Projektliste ab.
      basisHash.value = null;
      ladeMeldungen.value = [`Aus Datei geladen: «${h.state.projekt.name || 'Ohne Namen'}» (Schema ${h.vonVersion}).`, ...h.protokoll, ...h.probleme];
      meldeErgebnis(speichereEntwurf(speicher, h.state, null));
      return true;
    },
    loeschen(id) {
      const r = projektLoeschen(speicher, id);
      meldeErgebnis(r);
      listeNeu();
      if (r.ok && id === store.state.value.meta.id) basisHash.value = null;
      return r;
    },
    async ueberallLoeschen(id) {
      const zeile = zeilen.value.find((z) => z.id === id);
      const inCloud = !!zeile && zeile.cloud !== null && zeile.cloud !== 'nurLokal' && zeile.cloud !== 'nichtMehrInCloud';
      if (inCloud) {
        if (!cloud || cloudStatus.value !== 'angemeldet') return { ok: false, text: 'Für das Löschen in der Cloud bitte anmelden.' };
        const lokal = projektListe(speicher).find((e) => e.id === id);
        const version = zeile.cloud === 'serverNeuer' || !lokal ? (cloudListe.value?.find((c) => c.id === id)?.version ?? null) : (lokal.cloudVersion ?? null);
        const r = await nacheinander(() => cloud.loeschen(id, version));
        if (!r.ok && r.art === 'konflikt') {
          cloudEintragSetzen(r.server);
          return { ok: false, text: 'Das Projekt wurde inzwischen auf einem anderen Gerät geändert — erst öffnen, dann löschen.' };
        }
        if (!r.ok && r.art !== 'nichtGefunden') {
          behandleFehler(r);
          return { ok: false, text: r.text };
        }
        if (cloudListe.value) cloudListe.value = cloudListe.value.filter((c) => c.id !== id);
        konflikte.value = konflikte.value.filter((k) => k.id !== id);
      }
      if (projektListe(speicher).some((e) => e.id === id)) {
        const r = api.loeschen(id);
        if (!r.ok) return { ok: false, text: r.text };
      }
      return { ok: true };
    },
    cloudPruefen: () => nacheinander(pruefen),
    cloudAbgleichen: () => nacheinander(abgleichen),
    cloudOffline() {
      if (!cloud) return;
      cloudStatus.value = 'offline';
      cloudText.value = 'Keine Verbindung — gespeichert wird nur auf diesem Gerät.';
    },
    async anmelden(passwort) {
      if (!cloud) return { ok: false, art: 'server', text: 'Cloud nicht verfügbar.' };
      const r = await nacheinander(() => cloud.anmelden(passwort));
      if (r.ok) {
        cloudStatus.value = 'angemeldet';
        cloudText.value = null;
        await nacheinander(abgleichen);
      } else if (r.art === 'offline') api.cloudOffline();
      return r;
    },
    async abmelden() {
      if (!cloud) return;
      const r = await nacheinander(() => cloud.abmelden());
      if (!r.ok && r.art === 'offline') return api.cloudOffline();
      cloudStatus.value = 'abgemeldet';
      cloudText.value = r.ok ? null : r.text;
      cloudListe.value = null;
      konflikte.value = [];
    },
    async konfliktLoesen(wahl) {
      const k = konflikte.value[0];
      if (!k || !cloud) return;
      konflikte.value = konflikte.value.slice(1);
      if (wahl === 'spaeter') return;
      if (wahl === 'ueberschreiben') return nacheinander(() => hochladen(k.id, k.server.version));
      // Kopie: mein Stand wird ein neues Projekt, das Original übernimmt den Server-Stand.
      const lokal = projektListe(speicher).find((e) => e.id === k.id);
      if (!lokal) return void serverStandUebernehmen(k.server, k.server.stateJson);
      const hl = hydrateState(lokal.state, kontext());
      if (!hl.ok) {
        cloudText.value = hl.text;
        return;
      }
      const hs = serverStandUebernehmen(k.server, k.server.stateJson);
      if (!hs.ok) {
        cloudText.value = hs.text;
        return;
      }
      const jetzt = store.uhr();
      const neueId = store.neueId('p');
      const name = `${hl.state.projekt.name.trim() || 'Unbenanntes Projekt'} (Kopie)`;
      const kopie: State = { ...hl.state, projekt: { ...hl.state.projekt, name }, meta: { ...hl.state.meta, id: neueId, erstellt: jetzt, geaendert: jetzt } };
      meldeErgebnis(eintragSchreiben(speicher, { id: neueId, name, methode: kopie.methode, geaendert: jetzt, gespeichert: jetzt, qhW: lokal.qhW, qhlW: lokal.qhlW, state: kopie }));
      listeNeu();
      // War das Projekt offen, arbeitet man in der Kopie weiter (der eigene Stand bleibt vor Augen).
      if (store.state.value.meta.id === k.id) {
        const ungespeicherteAenderung = ungespeichert.value;
        autosave.abbrechen();
        const offen = ungespeicherteAenderung ? { ...store.state.value, projekt: { ...store.state.value.projekt, name }, meta: { ...store.state.value.meta, id: neueId } } : kopie;
        store.ersetze(offen);
        basisHash.value = stateHash(kopie);
        meldeErgebnis(speichereEntwurf(speicher, offen, basisHash.value));
      }
      ladeMeldungen.value = [`Konflikt gelöst: Ihr Stand liegt jetzt als «${name}», «${hs.state.projekt.name || 'Unbenanntes Projekt'}» zeigt den Server-Stand.`];
      await nacheinander(() => hochladen(neueId));
    },
    async cloudFertig() {
      while (laufend.value > 0) await kette;
    },
  };
  return api;
}

/** localStorage, falls nutzbar; sonst flüchtiger Speicher (Status zeigt dann den Fehler beim ersten Speichern). */
export function browserSpeicher(): Speicher {
  try {
    const ls = globalThis.localStorage;
    const probe = '__thermowerk_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    const m = new Map<string, string>();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: () => {
        const e = new Error('Speicher gesperrt');
        e.name = 'SecurityError';
        throw e;
      },
      removeItem: (k) => void m.delete(k),
    };
  }
}
