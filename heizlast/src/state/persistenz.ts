/**
 * Lokale Persistenz (Session 6; UX-20/21, BUILD-05/09/10): Entwurf-Slot + Projektliste im localStorage,
 * Autosave entprellt (≥ 1 s), Fehler sichtbar (Quota, gesperrter Speicher), «Neu»/«Laden» mit Rückfrage
 * bei ungespeicherten Änderungen, Cloud-Schnittstelle vorbereitet (Session 10).
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
import type { Methode, State } from './schema';
import { neuerState } from './schema';
import type { Store } from './store';

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
  /** Versionsmarke für die Cloud (Session 10: optimistisches Locking). */
  cloudVersion?: string;
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
    ...(alt?.cloudVersion ? { cloudVersion: alt.cloudVersion } : {}),
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

/* --- Cloud (Session 10) ----------------------------------------------------------------------- */

export interface CloudEintrag {
  id: string;
  name: string;
  geaendert: string;
  version: string;
  qhW: number | null;
}

export type CloudSpeichernErgebnis = { ok: true; version: string } | { ok: false; konflikt: { serverVersion: string; serverState: unknown } } | { ok: false; fehler: string };

/** Schnittstelle für den Cloud-Sync (Umsetzung Session 10: Cloudflare Functions + D1). */
export interface CloudSchnittstelle {
  verfuegbar(): Promise<boolean>;
  liste(): Promise<CloudEintrag[]>;
  laden(id: string): Promise<{ state: unknown; version: string } | null>;
  speichern(state: State, basisVersion: string | null): Promise<CloudSpeichernErgebnis>;
  loeschen(id: string): Promise<boolean>;
}

export const keineCloud: CloudSchnittstelle = {
  verfuegbar: async () => false,
  liste: async () => [],
  laden: async () => null,
  speichern: async () => ({ ok: false, fehler: 'Cloud nicht verfügbar (Session 10)' }),
  loeschen: async () => false,
};

/* --- Projektverwaltung (Store + Speicher + Rückfragen) ---------------------------------------- */

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
  starten(): void;
  stoppen(): void;
  /** Ausstehende Entwurf-Sicherung sofort schreiben (Seite wird verlassen/verborgen). */
  sichern(): void;
  speichern(): SpeicherErgebnis;
  neu(): Promise<boolean>;
  laden(id: string): Promise<boolean>;
  loeschen(id: string): SpeicherErgebnis;
}

export function erstelleProjektverwaltung(o: {
  store: Store;
  speicher: Speicher;
  /** Rückfrage bei ungespeicherten Änderungen; true = verwerfen und fortfahren. */
  bestaetigen: (frage: string) => boolean | Promise<boolean>;
  timer?: Timer;
  autosaveMs?: number;
}): Projektverwaltung {
  const { store, speicher } = o;
  const basisHash = signal<string | null>(null);
  const fehler = signal<string | null>(null);
  const ladeMeldungen = signal<string[]>([]);
  const liste = signal<ProjektEintrag[]>(projektListe(speicher));
  const aktuellerHash = computed(() => stateHash(store.state.value));
  /** «neu» ohne Eingaben gilt nicht als ungespeichert. */
  const ungespeichert = computed(() => (basisHash.value === null ? !istLeer(store.state.value) : aktuellerHash.value !== basisHash.value));
  const status = computed<SpeicherStatus>(() => (fehler.value ? 'fehler' : basisHash.value === null && !ungespeichert.value ? 'neu' : ungespeichert.value ? 'ungespeichert' : 'gespeichert'));

  const meldeErgebnis = (r: SpeicherErgebnis) => {
    fehler.value = r.ok ? null : r.text;
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

  return {
    ungespeichert,
    status,
    fehler,
    ladeMeldungen,
    liste,
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
        liste.value = projektListe(speicher);
        meldeErgebnis(speichereEntwurf(speicher, s, basisHash.value));
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
      const h = projektLaden(speicher, id, kontext());
      if (!h.ok) {
        ladeMeldungen.value = [h.text];
        return false;
      }
      autosave.abbrechen();
      store.ersetze(h.state);
      basisHash.value = stateHash(h.state);
      ladeMeldungen.value = [...h.protokoll, ...h.probleme];
      meldeErgebnis(speichereEntwurf(speicher, h.state, basisHash.value));
      return true;
    },
    loeschen(id) {
      const r = projektLoeschen(speicher, id);
      meldeErgebnis(r);
      liste.value = projektListe(speicher);
      if (r.ok && id === store.state.value.meta.id) basisHash.value = null;
      return r;
    },
  };
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
