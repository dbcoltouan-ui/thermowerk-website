/**
 * UI-Zustand der Shell (Navigation). Fachliche Angaben liegen im Store (State v2); hier nur, welcher Schritt
 * offen ist, und schmale Zugriffe für die Shell. Keine abgeleiteten Werte.
 */
import { computed, signal } from '@preact/signals';
import type { SchrittId } from '../kern/relevanz';
import { store, verwaltung } from './app';
import type { Methode } from './schema';

/** Offener Schritt — Navigation, nicht Teil des Projekts. Über die id, damit ein Moduswechsel nicht verrutscht. */
export const aktiverSchritt = signal<SchrittId>('projekt');

/** Projektname — eine Quelle: `state.projekt.name` (Topbar = Schritt 0 = Projektliste = Bericht). */
export const projektname = computed(() => store.state.value.projekt.name);
export const methode = computed<Methode | null>(() => store.state.value.methode);
export const ergebnis = store.ergebnis;
export const speicherstatus = verwaltung.status;
export const speicherfehler = verwaltung.fehler;

export const projektnameAnzeige = computed(() => projektname.value.trim() || 'Neues Projekt');

export function setzeMethode(neu: Methode): void {
  store.setzeMethode(neu);
}

/** Zusatzmodule (Förderung, Bewilligung, Offerte) — eigene Navigationsgruppe ausserhalb der Schrittfolge (Anbindung Session 11). */
export type ZusatzId = 'foerderung' | 'bewilligung' | 'offerte';
/** Offenes Zusatzmodul; null = die Schrittfolge ist aktiv. */
export const aktiveZusatz = signal<ZusatzId | null>(null);

/** Springt zu einem Schritt (nur sichtbare Schritte) und an den Seitenanfang. */
export function geheZu(id: SchrittId): void {
  if (!store.ergebnis.value.relevanteSchritte.includes(id)) return;
  aktiveZusatz.value = null;
  aktiverSchritt.value = id;
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
}

/** Öffnet ein Zusatzmodul (der zuletzt offene Schritt bleibt gemerkt). */
export function geheZuZusatz(id: ZusatzId): void {
  aktiveZusatz.value = id;
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
}
