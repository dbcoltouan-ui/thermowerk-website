// Thermowerk Heizlast — Cloud-Projekt-Sync mit Sanity
// --------------------------------------------------------------
// Wrapper für die bestehende Cloudflare Pages Function
// `functions/api/heizlast-projects.js`. Alle Endpoints setzen den
// Auth-Cookie `tw_heizlast_auth` voraus (wird von `/api/heizlast-auth`
// gesetzt). Requests sind same-origin, Cookies gehen automatisch mit.
//
// Aufruf von UI:
//   await listProjects();                          // Projektliste laden
//   await loadProject(id);                         // ein Projekt in den Store ziehen
//   const id = await saveProject({ asNew });       // aktueller State in Cloud
//   await deleteProject(id);
//
// projectList + projectListLoaded im state.ts werden hier aktualisiert,
// damit UI-Komponenten reagieren können.

import {
  heizlastState,
  projectList,
  projectListLoaded,
  uiState,
  isDirty,
} from './state.ts';
import type { HeizlastState, ProjectListItem } from './state.ts';
import { serializeState, deserializeState } from './storage.ts';

const API_BASE = '/api/heizlast-projects';

// ---------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------

async function jsonFetch<T = any>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  uiState.setKey('syncInFlight', true);
  uiState.setKey('lastError', null);
  try {
    const resp = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      ...init,
    });
    const data = (await resp.json()) as T & {
      success?: boolean;
      error?: string;
    };
    if (!resp.ok || data.success === false) {
      const msg = (data && data.error) || `HTTP ${resp.status}`;
      throw new Error(msg);
    }
    return data as T;
  } catch (err: any) {
    uiState.setKey('lastError', err?.message || String(err));
    throw err;
  } finally {
    uiState.setKey('syncInFlight', false);
  }
}

// ---------------------------------------------------------------
// Projektliste
// ---------------------------------------------------------------

/**
 * Holt die Projektliste von Sanity (ohne stateJson, kompakt).
 * Schreibt Ergebnis in `projectList` und setzt `projectListLoaded=true`.
 * Wirft bei Auth-Fehlern (401) — UI muss dann Login-Modal öffnen.
 */
export async function listProjects(): Promise<ProjectListItem[]> {
  const data = await jsonFetch<{ success: true; projects: ProjectListItem[] }>(
    API_BASE,
  );
  const items = data.projects || [];
  projectList.set(items);
  projectListLoaded.set(true);
  return items;
}

// ---------------------------------------------------------------
// Laden / Speichern einzelner Projekte
// ---------------------------------------------------------------

/**
 * Holt ein einzelnes Projekt (inkl. stateJson) und übernimmt es in den Store.
 * Gibt das rohe Sanity-Dokument zurück (inkl. Metadaten), damit die UI
 * z. B. createdAt anzeigen kann.
 */
export async function loadProject(id: string): Promise<any> {
  const url = `${API_BASE}?id=${encodeURIComponent(id)}`;
  const data = await jsonFetch<{ success: true; project: any }>(url);
  const project = data.project;
  if (!project) throw new Error('Projekt nicht gefunden');

  const parsed = project.stateJson ? deserializeState(project.stateJson) : null;
  if (!parsed) throw new Error('Projekt-Daten konnten nicht gelesen werden');

  // Metadaten aus Sanity in den State übernehmen (überschreiben stateJson-Werte).
  parsed.projectId = project._id;
  parsed.projectName = project.projectName || parsed.projectName;
  parsed.customerName = project.customerName || parsed.customerName;
  parsed.address = project.address || parsed.address;
  parsed.notes = project.notes || parsed.notes;
  parsed.status = project.status || parsed.status;
  parsed.createdAt = project.createdAt || parsed.createdAt;
  parsed.updatedAt = project.updatedAt || parsed.updatedAt;

  heizlastState.set(parsed);
  isDirty.set(false);
  return project;
}

export interface SaveOptions {
  /** true = neues Projekt (ohne ID), auch wenn state.projectId gesetzt ist. */
  asNew?: boolean;
  /** Ergebnisse aus compute.ts — werden als Snapshot-Felder in Sanity gespeichert. */
  computed?: { qhl?: number | null; qh?: number | null; ebf?: number | null };
}

/**
 * Speichert den aktuellen Store-State in Sanity (create oder update).
 * Gibt die neue/bestehende Projekt-ID zurück. Setzt isDirty=false nach Erfolg.
 */
export async function saveProject(opts: SaveOptions = {}): Promise<string> {
  const state = heizlastState.get();
  const id = opts.asNew ? undefined : state.projectId || undefined;
  const computed = opts.computed || {};

  const body = {
    id,
    projectName: state.projectName || 'Unbenannt',
    customerName: state.customerName,
    address: state.address,
    qhl: computed.qhl ?? null,
    qh: computed.qh ?? null,
    ebf: computed.ebf ?? state.gebaeude.ebf ?? null,
    stateJson: serializeState(state),
    status: state.status,
    notes: state.notes,
    createdAt: state.createdAt || undefined,
  };

  const data = await jsonFetch<{ success: true; id: string }>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const newId = data.id;
  heizlastState.setKey('projectId', newId);
  heizlastState.setKey('updatedAt', new Date().toISOString());
  if (!state.createdAt) heizlastState.setKey('createdAt', new Date().toISOString());
  uiState.setKey('lastCloudSave', Date.now());
  isDirty.set(false);

  // Liste optimistisch aktualisieren, falls bereits geladen.
  if (projectListLoaded.get()) {
    const current = projectList.get();
    const existingIdx = current.findIndex((p) => p._id === newId);
    const entry: ProjectListItem = {
      _id: newId,
      projectName: body.projectName,
      customerName: body.customerName,
      address: body.address,
      qhl: body.qhl,
      qh: body.qh,
      ebf: body.ebf,
      status: body.status,
      createdAt: body.createdAt,
      updatedAt: new Date().toISOString(),
      notes: body.notes,
    };
    if (existingIdx >= 0) {
      const next = current.slice();
      next[existingIdx] = entry;
      projectList.set(next);
    } else {
      projectList.set([entry, ...current]);
    }
  }

  return newId;
}

/** Löscht ein Projekt aus Sanity und aus der Projektliste. */
export async function deleteProject(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (projectListLoaded.get()) {
    projectList.set(projectList.get().filter((p) => p._id !== id));
  }
  if (heizlastState.get().projectId === id) {
    heizlastState.setKey('projectId', null);
  }
}

// ---------------------------------------------------------------
// Auth-Status (Cookie-Existenz ist nur via HTTP-Request prüfbar, weil
// der Cookie HttpOnly ist. Wir leiten die Info aus `body.is-auth`-Klasse
// ab, die serverseitig gesetzt werden sollte. Fallback: Proberequest.)
// ---------------------------------------------------------------

/**
 * Prüft den Auth-Status über einen GET auf die Projekte-API (ohne ID).
 * 401 → nicht eingeloggt; alles andere → eingeloggt. Setzt uiState.isAuthenticated.
 */
export async function probeAuth(): Promise<boolean> {
  try {
    await listProjects();
    uiState.setKey('isAuthenticated', true);
    return true;
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    const is401 = msg.includes('nicht autorisiert') || msg.includes('401');
    uiState.setKey('isAuthenticated', !is401);
    return !is401;
  }
}
