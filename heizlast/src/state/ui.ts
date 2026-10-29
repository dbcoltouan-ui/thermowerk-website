/**
 * UI-Zustand der Shell. Fachliche Angaben liegen im Store (State v2, Session 6); hier nur die
 * reine Navigation und schmale Zugriffe für die Shell-Komponenten. Keine abgeleiteten Werte.
 */
import { computed, signal } from '@preact/signals';
import { store, verwaltung } from './app';
import type { Methode } from './schema';

/** Index des aktiven Schritts (0 = Projekt & Methode) — Navigation, nicht Teil des Projekts. */
export const aktiverSchritt = signal(0);

/** Projektname — eine Quelle: `state.projekt.name` (Topbar = Schritt 0 = Projektliste = Bericht). */
export const projektname = computed(() => store.state.value.projekt.name);
export const methode = computed<Methode | null>(() => store.state.value.methode);
export const ergebnis = store.ergebnis;
export const speicherstatus = verwaltung.status;
export const speicherfehler = verwaltung.fehler;

export const projektnameAnzeige = computed(() => projektname.value.trim() || 'Neues Projekt');

export function setzeProjektname(name: string): void {
  store.setze('projekt.name', name);
}

export function setzeMethode(neu: Methode): void {
  store.setzeMethode(neu);
}

export function geheZuSchritt(index: number, anzahl: number): void {
  if (index < 0 || index >= anzahl) return;
  aktiverSchritt.value = index;
}
