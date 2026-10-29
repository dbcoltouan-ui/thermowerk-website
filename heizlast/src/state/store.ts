/**
 * Store (Session 6): ein Signal mit dem State (nur Rohangaben) und ein berechnetes Signal mit dem Ergebnis.
 *
 *   state (Signal)  ──berechne(state, daten)──▶  ergebnis (computed)  ──▶ UI, Dashboard, Bericht, Persistenz
 *
 * Änderungen laufen nur über `setze(pfad, wert)` bzw. benannte Aktionen; jede erzeugt einen neuen State
 * (unveränderlich), setzt `meta.geaendert` und löst genau eine Neuberechnung aus — kein setTimeout, kein
 * globales Devtool-Objekt (CODE-04/05, FLOW-15). Abgeleitete Werte werden nie in den State geschrieben.
 */
import type { ReadonlySignal, Signal } from '@preact/signals';
import { batch, computed, signal } from '@preact/signals';
import type { Datensatz } from '../daten/index';
import type { Ergebnis } from '../kern/berechne';
import { berechne } from '../kern/berechne';
import type { RaumEingabe } from '../kern/raumweise';
import type { HeizflaecheEingabe, HeizkreisEingabe } from '../kern/waermeabgabe';
import { heizflaecheBauartWechseln } from '../kern/waermeabgabe';
import type { Bauart } from '../kern/waermeabgabe';
import { standardBauteiltypen } from '../kern/huelle';
import type { Methode, State } from './schema';
import { neuerState } from './schema';

const istObjekt = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Leeres Objekt für fehlende Zwischenknoten (Record-Einträge wie `waermeabgabe.raeume.<id>`). */
function leererKnoten(pfadBisher: string[]): Record<string, unknown> {
  if (pfadBisher.length === 3 && pfadBisher[0] === 'waermeabgabe' && pfadBisher[1] === 'raeume') return { heizflaechen: [] };
  return {};
}

function setzeIn(obj: unknown, teile: string[], wert: unknown, bisher: string[]): unknown {
  if (!teile.length) return wert;
  const [k, ...rest] = teile as [string, ...string[]];
  if (Array.isArray(obj)) {
    let i = obj.findIndex((e) => istObjekt(e) && e.id === k);
    if (i < 0 && /^\d+$/.test(k)) i = Number(k);
    if (i < 0 || i >= obj.length) throw new Error(`Pfad unbekannt: ${[...bisher, k].join('.')}`);
    const kopie = obj.slice();
    if (!rest.length && wert === undefined) kopie.splice(i, 1);
    else kopie[i] = setzeIn(obj[i], rest, wert, [...bisher, k]);
    return kopie;
  }
  const basis = istObjekt(obj) ? obj : leererKnoten(bisher);
  const kopie: Record<string, unknown> = { ...basis };
  if (!rest.length && wert === undefined) delete kopie[k];
  else kopie[k] = setzeIn(basis[k], rest, wert, [...bisher, k]);
  return kopie;
}

/** Reiner Setter: neuer State mit `wert` unter `pfad` (Listen über id; `undefined` löscht). Wirft bei unbekanntem Pfad. */
export function setzeImState(s: State, pfad: string, wert: unknown): State {
  return setzeIn(s, pfad.split('.'), wert, []) as State;
}

export interface StoreOptionen {
  daten: Datensatz;
  /** ISO-Zeitstempel (Tests: feste Uhr). */
  uhr?: () => string;
  /** Neue ids (Tests: deterministisch). */
  neueId?: (praefix: string) => string;
  anfang?: State;
}

export interface Store {
  state: Signal<State>;
  ergebnis: ReadonlySignal<Ergebnis>;
  uhr: () => string;
  neueId: (praefix: string) => string;
  setze: (pfad: string, wert: unknown) => void;
  aktion: (fn: (s: State) => State) => void;
  ersetze: (s: State) => void;
  neu: () => State;
  setzeMethode: (m: Methode) => void;
  raumHinzufuegen: (teil?: Partial<RaumEingabe>) => string;
  raumEntfernen: (id: string) => void;
  heizkreisHinzufuegen: (teil?: Partial<HeizkreisEingabe>) => string;
  heizkreisEntfernen: (id: string, ersatzId?: string) => void;
  heizflaecheHinzufuegen: (raumId: string, bauart: Bauart) => string;
  heizflaecheBauart: (raumId: string, hfId: string, bauart: Bauart) => void;
  standardBauteiltypenAnlegen: () => void;
}

let zaehler = 0;
const zufallsId = (praefix: string) => `${praefix}-${Date.now().toString(36)}${(zaehler++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function erstelleStore(o: StoreOptionen): Store {
  const uhr = o.uhr ?? (() => new Date().toISOString());
  const neueId = o.neueId ?? zufallsId;
  const state = signal<State>(o.anfang ?? neuerState({ id: neueId('p'), jetzt: uhr() }));
  const ergebnis = computed(() => berechne(state.value, o.daten));

  const aendern = (neu: State) => {
    state.value = { ...neu, meta: { ...neu.meta, geaendert: uhr() } };
  };
  const aktion = (fn: (s: State) => State) => aendern(fn(state.value));
  const setze = (pfad: string, wert: unknown) => {
    try {
      aendern(setzeImState(state.value, pfad, wert));
    } catch (e) {
      console.warn(String(e));
    }
  };

  return {
    state,
    ergebnis,
    uhr,
    neueId,
    setze,
    aktion,
    ersetze: (s) => {
      state.value = s;
    },
    neu: () => {
      const s = neuerState({ id: neueId('p'), jetzt: uhr() });
      state.value = s;
      return s;
    },
    setzeMethode: (m) => setze('methode', m),
    raumHinzufuegen: (teil = {}) => {
      const id = neueId('r');
      aktion((s) => ({ ...s, raeume: [...s.raeume, { name: `Raum ${s.raeume.length + 1}`, typ: 'wohnen', bauteile: [], ...teil, id }] }));
      return id;
    },
    /** Entfernt den Raum samt seinen Heizflächen (keine verwaisten Referenzen, FLOW-18). */
    raumEntfernen: (id) =>
      aktion((s) => {
        const { [id]: _weg, ...restRaeume } = s.waermeabgabe.raeume;
        return { ...s, raeume: s.raeume.filter((r) => r.id !== id), waermeabgabe: { ...s.waermeabgabe, raeume: restRaeume } };
      }),
    heizkreisHinzufuegen: (teil = {}) => {
      const id = neueId('k');
      aktion((s) => ({ ...s, waermeabgabe: { ...s.waermeabgabe, heizkreise: [...s.waermeabgabe.heizkreise, { ...teil, id }] } }));
      return id;
    },
    /** Entfernt einen Heizkreis; zugeordnete Heizflächen gehen an `ersatzId` oder werden ohne Kreis geführt (FLOW-18). */
    heizkreisEntfernen: (id, ersatzId) =>
      aktion((s) => {
        const raeume = Object.fromEntries(
          Object.entries(s.waermeabgabe.raeume).map(([rid, r]) => [
            rid,
            {
              ...r,
              heizflaechen: r.heizflaechen.map((hf) => {
                if (hf.kreisId !== id) return hf;
                const { kreisId: _alt, ...ohne } = hf;
                return ersatzId ? { ...ohne, kreisId: ersatzId } : (ohne as HeizflaecheEingabe);
              }),
            },
          ]),
        );
        return { ...s, waermeabgabe: { ...s.waermeabgabe, heizkreise: s.waermeabgabe.heizkreise.filter((k) => k.id !== id), raeume } };
      }),
    heizflaecheHinzufuegen: (raumId, bauart) => {
      const id = neueId('hf');
      aktion((s) => {
        const r = s.waermeabgabe.raeume[raumId] ?? { heizflaechen: [] };
        const kreis = s.waermeabgabe.heizkreise.length === 1 ? s.waermeabgabe.heizkreise[0]?.id : undefined;
        const hf: HeizflaecheEingabe = kreis ? { id, bauart, kreisId: kreis } : { id, bauart };
        return { ...s, waermeabgabe: { ...s.waermeabgabe, raeume: { ...s.waermeabgabe.raeume, [raumId]: { ...r, heizflaechen: [...r.heizflaechen, hf] } } } };
      });
      return id;
    },
    /** Bauart wechseln: Masse der alten Bauart werden verworfen (Platte ↔ Platte behält die Nische, HK-20). */
    heizflaecheBauart: (raumId, hfId, bauart) =>
      aktion((s) => {
        const r = s.waermeabgabe.raeume[raumId];
        if (!r) return s;
        return { ...s, waermeabgabe: { ...s.waermeabgabe, raeume: { ...s.waermeabgabe.raeume, [raumId]: { ...r, heizflaechen: r.heizflaechen.map((hf) => (hf.id === hfId ? heizflaecheBauartWechseln(hf, bauart, o.daten.hk) : hf)) } } } };
      }),
    /** Legt die Standard-Bauteiltypen aus Keller/Dachform an (nur wenn noch keine erfasst sind). */
    standardBauteiltypenAnlegen: () =>
      batch(() =>
        aktion((s) => {
          if (s.huelle.bauteiltypen.length) return s;
          const g = s.gebaeude;
          const typen = standardBauteiltypen({
            ...(g.dachform ? { dachform: g.dachform } : {}),
            ...(g.dachraumBeheizt !== undefined ? { dachraumBeheizt: g.dachraumBeheizt } : {}),
            ...(g.keller ? { keller: g.keller } : {}),
          }).map(({ sanierung: _s, ...t }) => t);
          return { ...s, huelle: { ...s.huelle, bauteiltypen: typen } };
        }),
      ),
  };
}
