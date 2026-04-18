// Thermowerk Heizlast — Two-Way-Binding zwischen DOM und heizlastState
// --------------------------------------------------------------
// Erlaubt deklaratives Anbinden von Inputs / Selects / Textareas / Checkboxes
// an den Nano Stores Store mittels data-hz-bind="path.to.field" Attributen.
//
// Supportet:
//   - <input type="number|text|date">  → number | string
//   - <input type="checkbox">          → boolean
//   - <input type="radio" name="...">  → string (aktive Option)
//   - <select>                         → string
//   - <textarea>                       → string
//
// Datentyp wird aus data-hz-type="number|string|boolean" abgeleitet,
// fallback = automatisch aus element.type.
//
// Pfad-Konventionen:
//   - "gebaeude.ebf"            → state.gebaeude.ebf
//   - "projectName"             → state.projectName
//   - "notizen.sektion1.text"   → state.notizen.sektion1.text
//
// Einmal pro Seite bootBindings() aufrufen. Dann:
//   1. initial: liest den State und setzt die Input-Werte.
//   2. abonniert change/input-Events → schreibt zurück in den Store.
//   3. abonniert Store-Änderungen → schreibt Werte in andere DOM-Elemente
//      mit gleichem data-hz-bind (Broadcast).
//
// Phase 9 / Block A — Override-Handling:
//   Wenn ein Input innerhalb eines [data-hz-override-field="<pfad>"]-Wrappers
//   liegt UND der User den Wert tatsaechlich aendert, rufen wir
//   setOverride(pfad, true) auf. Der Store-Subscriber setzt dann die Klasse
//   .is-overridden auf dem Wrapper (CSS macht den Reset-Pfeil sichtbar).
//   Bei clearOverride() via Reset-Button (siehe OverrideField.astro) wird die
//   Klasse wieder entfernt und das Feld zeigt den Default-Wert.

import { heizlastState, isDirty, setOverride, isOverridden, resolveDefault } from './state.ts';
import type { HeizlastState } from './state.ts';

type BindType = 'number' | 'string' | 'boolean';

interface BindingMeta {
  path: string;
  type: BindType;
}

/** Liest verschachtelten Pfad aus Objekt. Gibt undefined wenn unvollständig. */
export function getPath(obj: any, path: string): unknown {
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Schreibt Wert in verschachtelten Pfad. Erzeugt ein neues Top-Level-Objekt,
 *  damit Nano Stores die Änderung registriert. */
export function setPath(state: HeizlastState, path: string, value: unknown): HeizlastState {
  const parts = path.split('.');
  if (parts.length === 0) return state;
  const [head, ...rest] = parts;
  const next: any = { ...state };
  if (rest.length === 0) {
    next[head] = value;
  } else {
    next[head] = setPathObj((state as any)[head], rest, value);
  }
  return next as HeizlastState;
}

function setPathObj(obj: any, parts: string[], value: unknown): any {
  const [head, ...rest] = parts;
  const clone = obj != null && typeof obj === 'object' && !Array.isArray(obj)
    ? { ...obj }
    : {};
  if (rest.length === 0) {
    clone[head] = value;
  } else {
    clone[head] = setPathObj(clone[head], rest, value);
  }
  return clone;
}

/** Koerziert DOM-Wert in den deklarierten Typ.
 *  - Leere Number-Inputs mit Override-Wrapper → null (Feld zeigt Default).
 *  - Leere Number-Inputs ohne Override-Wrapper → 0 (Legacy-Verhalten).
 *  - Min/Max-Attribute werden bei number-Typen respektiert (Clamp).
 *  - Komma als Dezimaltrenner wird akzeptiert. */
function coerce(rawValue: string | boolean, type: BindType, el?: HTMLElement): unknown {
  if (type === 'boolean') {
    return typeof rawValue === 'boolean' ? rawValue : rawValue === 'true' || rawValue === 'on' || rawValue === '1';
  }
  if (type === 'number') {
    if (typeof rawValue === 'boolean') return rawValue ? 1 : 0;
    if (rawValue === '' || rawValue == null) {
      // Override-Felder: leerer Input soll null werden (Feld faellt auf Default zurueck).
      if (el && el.closest && el.closest('[data-hz-override-field]')) return null;
      return 0;
    }
    const n = Number(String(rawValue).replace(',', '.'));
    if (!Number.isFinite(n)) return 0;
    // Min/Max aus HTML-Attribut clampen (schuetzt vor -20 im Tvoll u. ae.).
    if (el instanceof HTMLInputElement) {
      const minAttr = el.getAttribute('min');
      const maxAttr = el.getAttribute('max');
      let v = n;
      if (minAttr != null && minAttr !== '') {
        const mn = Number(minAttr);
        if (Number.isFinite(mn) && v < mn) v = mn;
      }
      if (maxAttr != null && maxAttr !== '') {
        const mx = Number(maxAttr);
        if (Number.isFinite(mx) && v > mx) v = mx;
      }
      return v;
    }
    return n;
  }
  return String(rawValue ?? '');
}

function meta(el: HTMLElement): BindingMeta | null {
  const path = el.getAttribute('data-hz-bind');
  if (!path) return null;
  const declared = el.getAttribute('data-hz-type') as BindType | null;
  let type: BindType = declared ?? 'string';
  if (!declared) {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio') type = el.type === 'checkbox' ? 'boolean' : 'string';
      else if (el.type === 'number') type = 'number';
    }
  }
  return { path, type };
}

function readDom(el: HTMLElement): string | boolean {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') return el.checked ? el.value : '';
    return el.value;
  }
  if (el instanceof HTMLSelectElement) return el.value;
  if (el instanceof HTMLTextAreaElement) return el.value;
  return (el as any).value ?? '';
}

function writeDom(el: HTMLElement, value: unknown): void {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox') {
      el.checked = Boolean(value);
      return;
    }
    if (el.type === 'radio') {
      el.checked = String(value) === el.value;
      return;
    }
    const next = value == null ? '' : String(value);
    if (el.value !== next) el.value = next;
    return;
  }
  if (el instanceof HTMLSelectElement) {
    const next = value == null ? '' : String(value);
    if (el.value !== next) el.value = next;
    return;
  }
  if (el instanceof HTMLTextAreaElement) {
    const next = value == null ? '' : String(value);
    if (el.value !== next) el.value = next;
    return;
  }
}

/** Findet den Override-Pfad, unter dem ein Input steht (falls vorhanden). */
function overridePathOf(el: HTMLElement): string | null {
  const wrapper = el.closest<HTMLElement>('[data-hz-override-field]');
  if (!wrapper) return null;
  return wrapper.getAttribute('data-hz-override-field');
}

/** Initialisiert alle gefundenen Bindings einmalig und meldet Event-Listener an.
 *  Gibt eine Unsubscribe-Funktion zurück. Mehrmals aufrufen ist safe (guard). */
export function bootBindings(root: ParentNode = document): () => void {
  if (typeof window === 'undefined') return () => {};
  if ((window as any).__hzBindingsBound) return () => {};
  (window as any).__hzBindingsBound = true;

  // 1) Beim Laden: DOM aus State füllen.
  syncDomFromState(root);

  // 2) DOM-Events → Store
  const handler = (ev: Event) => {
    const target = ev.target as HTMLElement | null;
    if (!target || !target.hasAttribute || !target.hasAttribute('data-hz-bind')) return;
    const m = meta(target);
    if (!m) return;
    let raw: string | boolean;
    if (target instanceof HTMLInputElement && target.type === 'radio') {
      if (!target.checked) return; // nur aktives Radio berücksichtigen
      raw = target.value;
    } else {
      raw = readDom(target);
    }
    const coerced = coerce(raw, m.type, target);
    const state = heizlastState.get();
    const current = getPath(state, m.path);
    if (current === coerced) return;
    heizlastState.set(setPath(state, m.path, coerced));
    isDirty.set(true);

    // Phase 9 / Block A: Echte User-Aenderung an einem Override-Feld markieren.
    // Synthetische Events (vom Reset-Button) tragen isTrusted=false — dort NICHT
    // als Override markieren, sonst wuerde der Reset gleich wieder ueberschrieben.
    if (ev.isTrusted) {
      const ovrPath = overridePathOf(target);
      if (ovrPath) setOverride(ovrPath, true);
    }
  };
  document.addEventListener('input', handler);
  document.addEventListener('change', handler);

  // 3) Store-Änderungen → alle DOM-Elemente broadcasten.
  const unsub = heizlastState.subscribe(() => {
    syncDomFromState(root);
    syncOverrideClasses(root);
  });

  // Initialer Sync der .is-overridden-Klassen (beim Laden aus localStorage).
  syncOverrideClasses(root);

  return () => {
    document.removeEventListener('input', handler);
    document.removeEventListener('change', handler);
    unsub();
  };
}

/** Liest aktuelle State-Werte und schreibt sie in alle data-hz-bind-Elemente.
 *  Paket D / E: Das aktuell fokussierte Element wird uebersprungen —
 *  verhindert iOS-Tastatur-Kollaps und Komma-Verlust beim Tippen.
 *
 *  Override-Felder: Wenn der gebundene Wert null/leer ist und nicht als Override
 *  markiert, zeigen wir den resolveDefault-Wert (z. B. tvoll aus Lage + Profil)
 *  an, damit der User den berechneten Default sieht statt eines leeren Feldes. */
export function syncDomFromState(root: ParentNode = document): void {
  if (typeof window === 'undefined') return;
  const state = heizlastState.get();
  const active = document.activeElement;
  const nodes = root.querySelectorAll<HTMLElement>('[data-hz-bind]');
  nodes.forEach((el) => {
    if (el === active) return; // fokussiertes Feld nie ueberschreiben (iOS-Fix)
    const m = meta(el);
    if (!m) return;
    let value = getPath(state, m.path);
    if (value === undefined) return;

    // Override-Field-Display: wenn das Feld zu einem Override-Wrapper gehoert
    // und der Override-Flag NICHT gesetzt ist, zeigen wir IMMER den Default
    // (unabhaengig vom gespeicherten Wert). Erst wenn der User das Feld
    // anfasst, wird `setOverride(true)` gesetzt und sein Wert uebernommen.
    if (m.type === 'number') {
      const ovrPath = overridePathOf(el);
      if (ovrPath && !isOverridden(state, ovrPath)) {
        const def = resolveDefault(state, ovrPath);
        if (def != null) value = def;
      }
    }

    if (el instanceof HTMLInputElement && el.type === 'radio') {
      el.checked = String(value) === el.value;
      return;
    }
    writeDom(el, value);
  });
}

/** Setzt die .is-overridden-Klasse auf allen [data-hz-override-field]-Wrappern
 *  passend zum aktuellen overrides-Record im State. */
export function syncOverrideClasses(root: ParentNode = document): void {
  if (typeof window === 'undefined') return;
  const state = heizlastState.get();
  const wrappers = root.querySelectorAll<HTMLElement>('[data-hz-override-field]');
  wrappers.forEach((w) => {
    const path = w.getAttribute('data-hz-override-field');
    if (!path) return;
    const on = isOverridden(state, path);
    w.classList.toggle('is-overridden', on);
  });
}
