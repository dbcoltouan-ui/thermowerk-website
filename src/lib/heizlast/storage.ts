// Thermowerk Heizlast — LocalStorage-Schicht
// --------------------------------------------------------------
// Serialisiert den Heizlast-State ins localStorage und lädt ihn beim
// Seitenstart zurück. Versioniert, mit Migrations-Hook für zukünftige
// Breaking Changes.
//
// Rolle im Gesamtbild:
// - localStorage = Arbeits-Puffer: damit offene Eingaben nicht verlorengehen,
//   wenn der Browser-Tab geschlossen oder neu geladen wird.
// - Sanity (Cloud) = dauerhafter Projekt-Speicher für eingeloggte Nutzer.
// - Externe Besucher ohne Login nutzen ausschliesslich localStorage
//   (ihre Daten landen NIE in Sanity).
//
// Key-Schema: `thermowerk.heizlast.state.v<VERSION>` — bei Versionssprung
// wird der alte Key automatisch gelöscht (nach erfolgreicher Migration oder
// auch ohne, wenn keine Migration implementiert ist). So bleibt der Browser
// sauber.

import { heizlastState, isDirty, STATE_VERSION, createDefaultState } from './state.ts';
import type { HeizlastState } from './state.ts';

const STORAGE_KEY = `thermowerk.heizlast.state.v${STATE_VERSION}`;
const LEGACY_KEYS = [
  // Mögliche Keys aus dem alten Rechner — werden entfernt, nicht migriert.
  'thermowerkHeizlast',
  'heizlast.state',
  'heizlast_state',
];

const SAVE_DEBOUNCE_MS = 500;

/** Nur im Browser (SSR-Safety). */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// ---------------------------------------------------------------
// Serialisierung
// ---------------------------------------------------------------

export function serializeState(state: HeizlastState): string {
  return JSON.stringify(state);
}

export function deserializeState(raw: string): HeizlastState | null {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    return migrateIfNeeded(obj);
  } catch {
    return null;
  }
}

/**
 * Migriert alte State-Formate auf die aktuelle Version.
 * Aktuell gibt es nur v1 — bei späteren Versionen hier ergänzen:
 *   if (obj.version === 1 && STATE_VERSION === 2) { obj = migrateV1toV2(obj); }
 */
function migrateIfNeeded(obj: any): HeizlastState | null {
  if (obj.version === STATE_VERSION) {
    // Sanfte v1-zu-v1-Migration: neuer overrides-Record seit Phase 9 / Block A.
    // Bestehende localStorage-States ohne diesen Record bekommen ein leeres
    // Objekt angehaengt (= nichts ueberschrieben).
    if (!obj.overrides || typeof obj.overrides !== 'object') {
      obj.overrides = {};
    }
    // Phase 9 / Block B: heizlast.method (Enum) → heizlast.methodsEnabled (Record).
    // Alte States, die noch `method` tragen, werden in den neuen Record
    // uebersetzt. `bauperiode` war immer der implizite Fallback und kommt
    // deshalb nicht mehr in den Record.
    if (obj.heizlast && typeof obj.heizlast === 'object') {
      if (!obj.heizlast.methodsEnabled || typeof obj.heizlast.methodsEnabled !== 'object') {
        const prev = typeof obj.heizlast.method === 'string' ? obj.heizlast.method : null;
        obj.heizlast.methodsEnabled = {
          verbrauch: prev === 'verbrauch',
          messung: prev === 'messung',
          bstd: prev === 'bstd',
          override: prev === 'override',
        };
      }
      if ('method' in obj.heizlast) delete obj.heizlast.method;
    }
    // Phase 9 / Block D: zuschlaege.sperrzeitActive wurde neu eingefuehrt.
    // Alte States ohne das Feld bekommen einen heuristischen Default: wenn
    // der User zuvor toff > 0 hatte, war die Sperrzeit implizit aktiv; bei
    // toff == 0 bleibt sie aus. So bleibt der Rechenkern nach dem Update
    // konsistent.
    if (obj.zuschlaege && typeof obj.zuschlaege === 'object') {
      if (typeof obj.zuschlaege.sperrzeitActive !== 'boolean') {
        const toff = Number(obj.zuschlaege.toff);
        obj.zuschlaege.sperrzeitActive = Number.isFinite(toff) && toff > 0;
      }
    }
    // Phase 9 / Block L: Notizen-Migration. SectionNote.includeInExport entfaellt
    // (wird beim Laden ignoriert). Altes sektion7 uebernimmt der neue projekt-Slot,
    // sofern dieser noch leer ist. Fehlende Notiz-Slots bekommen leeren Text.
    if (obj.notizen && typeof obj.notizen === 'object') {
      const keys = ['sektion1', 'sektion2', 'sektion3', 'sektion4', 'sektion5', 'sektion6', 'projekt'];
      // sektion7 (Legacy) -> projekt, falls projekt noch nicht gesetzt
      const legacy7 = obj.notizen.sektion7;
      if (legacy7 && typeof legacy7 === 'object' && typeof legacy7.text === 'string') {
        if (!obj.notizen.projekt || typeof obj.notizen.projekt !== 'object') {
          obj.notizen.projekt = { text: legacy7.text };
        } else if (!obj.notizen.projekt.text) {
          obj.notizen.projekt.text = legacy7.text;
        }
      }
      if ('sektion7' in obj.notizen) delete obj.notizen.sektion7;
      // Slots normalisieren, includeInExport entfernen
      for (const k of keys) {
        const n = obj.notizen[k];
        if (!n || typeof n !== 'object') {
          obj.notizen[k] = { text: '' };
        } else {
          obj.notizen[k] = { text: typeof n.text === 'string' ? n.text : '' };
        }
      }
    }
    // Paket C / Block G: qasPool + qasLueftung wurden neu eingefuehrt.
    // Alte States ohne diese Felder bekommen 0.
    if (obj.zuschlaege && typeof obj.zuschlaege === 'object') {
      if (typeof obj.zuschlaege.qasPool !== 'number') obj.zuschlaege.qasPool = 0;
      if (typeof obj.zuschlaege.qasLueftung !== 'number') obj.zuschlaege.qasLueftung = 0;
    }
    // Paket C / Block I: wohneinheiten entfernt — Feld wird beim Laden ignoriert (TypeScript).
    // Phase 9 / Block E: RaumInput um flaecheDirekt + beheizt erweitert.
    // Alte Eintraege ohne die neuen Felder bekommen beheizt=true (Default)
    // und flaecheDirekt=null; laenge/breite werden zu number|null normalisiert.
    if (obj.gebaeude && Array.isArray(obj.gebaeude.raeume)) {
      obj.gebaeude.raeume = obj.gebaeude.raeume.map((r: any) => {
        const laenge = typeof r?.laenge === 'number' && isFinite(r.laenge) ? r.laenge : null;
        const breite = typeof r?.breite === 'number' && isFinite(r.breite) ? r.breite : null;
        const flaecheDirekt =
          typeof r?.flaecheDirekt === 'number' && isFinite(r.flaecheDirekt)
            ? r.flaecheDirekt
            : null;
        const flaecheOverride =
          typeof r?.flaecheOverride === 'number' && isFinite(r.flaecheOverride)
            ? r.flaecheOverride
            : null;
        const beheizt = typeof r?.beheizt === 'boolean' ? r.beheizt : true;
        return {
          id: String(r?.id ?? ''),
          name: String(r?.name ?? ''),
          laenge,
          breite,
          flaecheDirekt,
          beheizt,
          flaecheOverride,
        };
      });
    }
    return obj as HeizlastState;
  }
  // Unbekannte Version → lieber Default-State zurückgeben, damit der Rechner
  // nicht mit korrupten Daten crashed.
  return null;
}

// ---------------------------------------------------------------
// Speichern / Laden
// ---------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Speichert sofort in localStorage (ohne Debounce). Für Tests und Shutdown. */
export function saveNow(state: HeizlastState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeState(state));
  } catch (err) {
    // Quota überschritten oder Privat-Modus — stumm schlucken, damit der
    // Rechner trotzdem funktioniert. Log zur Diagnose.
    console.warn('[heizlast/storage] saveNow fehlgeschlagen:', err);
  }
}

/** Debounced Save — wird von subscribeAutoSave() pro State-Änderung aufgerufen. */
export function scheduleSave(state: HeizlastState): void {
  if (!isBrowser()) return;
  if (saveTimer != null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveNow(state);
    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

/** Lädt den letzten Stand aus localStorage. Liefert null wenn nichts vorhanden. */
export function loadFromStorage(): HeizlastState | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return deserializeState(raw);
}

/** Löscht alle Einträge des Heizlast-Rechners aus localStorage. */
export function clearStorage(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    for (const legacyKey of LEGACY_KEYS) {
      window.localStorage.removeItem(legacyKey);
    }
  } catch {
    /* noop */
  }
}

/** Entfernt Keys früherer Versionen und des alten Rechners ohne aktuellen State anzufassen. */
export function cleanupLegacyKeys(): void {
  if (!isBrowser()) return;
  for (const legacyKey of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(legacyKey);
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------
// Auto-Save-Subscription
// ---------------------------------------------------------------

/**
 * Abonniert den heizlastState-Store und speichert jede Änderung debounced.
 * Muss einmal pro Seite (client-side) aufgerufen werden — idealerweise in
 * einem `<script>`-Block mit `define:vars` im HeizlastLayout.
 * Gibt eine Unsubscribe-Funktion zurück.
 */
export function subscribeAutoSave(): () => void {
  if (!isBrowser()) return () => {};
  return heizlastState.subscribe((state) => {
    scheduleSave(state);
  });
}

/**
 * Initialer Boot: lädt letzten Stand aus localStorage (falls vorhanden) und
 * setzt den Store. Muss genau einmal pro Seite beim Laden ausgeführt werden,
 * BEVOR UI-Komponenten ihre ersten Werte rendern.
 * Gibt zurück ob ein State geladen wurde.
 */
export function bootFromStorage(): boolean {
  if (!isBrowser()) return false;
  cleanupLegacyKeys();
  const loaded = loadFromStorage();
  if (!loaded) return false;
  heizlastState.set(loaded);
  isDirty.set(false);
  return true;
}

/** Kompletter Reset: Speicher leeren und Store auf Defaults setzen. */
export function hardReset(): void {
  clearStorage();
  heizlastState.set(createDefaultState());
  isDirty.set(false);
}

export const STORAGE_KEY_CURRENT = STORAGE_KEY;
