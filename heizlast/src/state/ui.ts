/**
 * UI-Zustand der Shell (Session 1).
 *
 * Platzhalter: Das fachliche State-Schema v2 (nur Rohangaben, schemaVersion,
 * hydrateState mit Migrationen) wird in Session 6 gebaut. Hier liegen nur die
 * wenigen Angaben, die die Shell heute braucht. Keine abgeleiteten Werte.
 */
import { signal, computed } from '@preact/signals';
import type { Methode } from './typen';

/** Index des aktiven Schritts (0 = Projekt & Methode). */
export const aktiverSchritt = signal(0);

/** Projektname — eine Quelle (Topbar = Schritt 0 = Bericht). */
export const projektname = signal('');

/** Gewählte Methode; null solange nichts gewählt (Schritt 0 unvollständig). */
export const methode = signal<Methode | null>(null);

/** Speicherstatus für die Topbar (Persistenz folgt in Session 6/10). */
export const speicherstatus = signal<'entwurf' | 'gespeichert' | 'fehler'>('entwurf');

export const projektnameAnzeige = computed(() => projektname.value.trim() || 'Neues Projekt');

export function setzeMethode(neu: Methode): void {
  methode.value = neu;
}

export function geheZuSchritt(index: number, anzahl: number): void {
  if (index < 0 || index >= anzahl) return;
  aktiverSchritt.value = index;
}
