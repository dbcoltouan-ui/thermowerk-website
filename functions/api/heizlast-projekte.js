// Cloudflare Pages Function: Projekte des Heizlast-Neubaus (Session 10; BUILD-06/08/12)
// Tabelle heizlast_projekt (migrations/0003_heizlast_neu.sql). Alle Aufrufe brauchen eine gültige Anmeldung
// (signiertes Cookie + Sitzung in D1, siehe _lib/heizlast-sitzung.js).
//
//   GET    /api/heizlast-projekte                 → 200 { ok, projekte: [Kopf] }            (ohne State)
//   GET    /api/heizlast-projekte?id=<id>         → 200 { ok, projekt: Kopf + stateJson } · 404
//   PUT    /api/heizlast-projekte?id=<id>         Body { stateJson, basisVersion, qhW?, qhlW? }
//          basisVersion null  → anlegen:   201 { ok, version } · 409 wenn schon vorhanden
//          basisVersion "…"   → ändern:    200 { ok, version } · 409 wenn der Server-Stand neuer ist · 404
//          409 enthält den Server-Stand: { ok: false, fehler, konflikt: { projekt: Kopf + stateJson } }
//   DELETE /api/heizlast-projekte?id=<id>[&version=…] → 200 · 404 · 409 (Version veraltet)
//   Kopf = { id, name, methode, schemaVersion, qhW, qhlW, erstellt, version }
//
// Validierung: id-Format, stateJson ≤ 512 KB, gültiges JSON-Objekt, meta.id = id, meta.schemaVersion ganzzahlig
// 1 … aktuelle Version (ältere erlaubt — der Client migriert beim Laden über hydrateState; der Server rechnet
// und migriert nicht). Optimistisches Locking über updated_at (Versionsmarke, streng steigend). D1-Fehlertexte
// gehen nie nach aussen.

import { SCHEMA_VERSION } from '../../heizlast/src/state/version.ts';
import { stelleSchemaSicher } from '../_lib/heizlast-schema.js';
import { anmeldungPruefen, json, serverfehler } from '../_lib/heizlast-sitzung.js';

export const ID_MUSTER = /^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/;
export const STATE_MAX_BYTES = 512 * 1024;
const BODY_MAX_BYTES = STATE_MAX_BYTES + 16 * 1024;
const METHODEN = new Set(['fws', 'raumweise']);

const enc = new TextEncoder();
const fehler = (status, text, extra = {}) => json(status, { ok: false, fehler: text, ...extra });

function kopf(row) {
  return {
    id: row.id,
    name: row.name,
    methode: row.methode ?? null,
    schemaVersion: row.schema_version,
    qhW: typeof row.qh_w === 'number' ? row.qh_w : null,
    qhlW: typeof row.qhl_w === 'number' ? row.qhl_w : null,
    erstellt: row.created_at,
    version: row.updated_at,
  };
}

const mitState = (row) => ({ ...kopf(row), stateJson: row.state_json });

const SPALTEN = 'id, name, methode, schema_version, qh_w, qhl_w, created_at, updated_at';

async function lesen(db, id) {
  return db.prepare(`SELECT ${SPALTEN}, state_json FROM heizlast_projekt WHERE id = ? LIMIT 1`).bind(id).first();
}

/** Neue Versionsmarke: jetzt, mindestens 1 ms nach der bisherigen (zwei Speichervorgänge in derselben ms bleiben unterscheidbar). */
export function neueVersion(bisher, jetztMs = Date.now()) {
  const alt = bisher ? Date.parse(bisher) : NaN;
  return new Date(Number.isFinite(alt) && alt >= jetztMs ? alt + 1 : jetztMs).toISOString();
}

function idAusUrl(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (id === null) return { id: null };
  return ID_MUSTER.test(id) ? { id } : { ungueltig: true };
}

/** Prüft den Body eines PUT; Ergebnis `{ ok: true, werte }` oder `{ ok: false, antwort }`. */
export function pruefeSpeichern(id, body) {
  const nein = (status, text) => ({ ok: false, antwort: fehler(status, text) });
  if (!body || typeof body !== 'object' || Array.isArray(body)) return nein(400, 'Ungültige Anfrage');
  const { stateJson, basisVersion } = body;
  if (typeof stateJson !== 'string') return nein(400, 'stateJson fehlt');
  if (enc.encode(stateJson).length > STATE_MAX_BYTES) return nein(413, `Projekt zu gross (max. ${STATE_MAX_BYTES / 1024} KB)`);
  if (basisVersion !== null && (typeof basisVersion !== 'string' || !Number.isFinite(Date.parse(basisVersion)))) return nein(400, 'basisVersion ungültig');
  let state;
  try {
    state = JSON.parse(stateJson);
  } catch {
    return nein(400, 'stateJson ist kein gültiges JSON');
  }
  if (!state || typeof state !== 'object' || Array.isArray(state)) return nein(400, 'stateJson ist kein Projekt');
  const meta = state.meta;
  const sv = meta && typeof meta === 'object' ? meta.schemaVersion : undefined;
  if (!Number.isInteger(sv) || sv < 1) return nein(400, 'Schemaversion fehlt');
  if (sv > SCHEMA_VERSION) return nein(400, `Schemaversion ${sv} ist neuer als die des Servers (${SCHEMA_VERSION})`);
  if (meta.id !== id) return nein(400, 'Projekt-id im Stand passt nicht zur Adresse');
  const zahl = (v) => (v === undefined || v === null ? null : typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const qhW = zahl(body.qhW);
  const qhlW = zahl(body.qhlW);
  if (qhW === undefined || qhlW === undefined) return nein(400, 'Kennzahlen ungültig');
  const name = typeof state.projekt?.name === 'string' ? state.projekt.name.trim().slice(0, 200) : '';
  const methode = METHODEN.has(state.methode) ? state.methode : null;
  return { ok: true, werte: { stateJson, basisVersion, schemaVersion: sv, name, methode, qhW, qhlW } };
}

async function vorbereiten(context) {
  const auth = await anmeldungPruefen(context);
  if (!auth.ok) return { antwort: auth.antwort };
  try {
    await stelleSchemaSicher(context.env.DB);
  } catch (e) {
    return { antwort: serverfehler(e, 'Schema') };
  }
  return { db: context.env.DB };
}

export async function onRequestGet(context) {
  const v = await vorbereiten(context);
  if (v.antwort) return v.antwort;
  const q = idAusUrl(context.request);
  if (q.ungueltig) return fehler(400, 'Ungültige Projekt-id');
  try {
    if (q.id) {
      const row = await lesen(v.db, q.id);
      return row ? json(200, { ok: true, projekt: mitState(row) }) : fehler(404, 'Projekt nicht gefunden');
    }
    const { results } = await v.db.prepare(`SELECT ${SPALTEN} FROM heizlast_projekt ORDER BY updated_at DESC`).all();
    return json(200, { ok: true, projekte: (results ?? []).map(kopf) });
  } catch (e) {
    return serverfehler(e, 'Projekte lesen');
  }
}

export async function onRequestPut(context) {
  const v = await vorbereiten(context);
  if (v.antwort) return v.antwort;
  const { request } = context;
  const q = idAusUrl(request);
  if (!q.id) return fehler(400, q.ungueltig ? 'Ungültige Projekt-id' : 'Projekt-id fehlt');
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return fehler(415, 'Nur JSON');
  const laenge = Number(request.headers.get('Content-Length') || 0);
  if (laenge > BODY_MAX_BYTES) return fehler(413, `Projekt zu gross (max. ${STATE_MAX_BYTES / 1024} KB)`);
  let body;
  try {
    const text = await request.text();
    if (enc.encode(text).length > BODY_MAX_BYTES) return fehler(413, `Projekt zu gross (max. ${STATE_MAX_BYTES / 1024} KB)`);
    body = JSON.parse(text);
  } catch {
    return fehler(400, 'Ungültige Anfrage');
  }
  const p = pruefeSpeichern(q.id, body);
  if (!p.ok) return p.antwort;
  const w = p.werte;
  const db = v.db;

  const konflikt = (row) => fehler(409, 'Der Server-Stand ist neuer', { konflikt: { projekt: mitState(row) } });
  try {
    if (w.basisVersion === null) {
      const jetzt = neueVersion(null);
      const r = await db
        .prepare(
          `INSERT INTO heizlast_projekt (id, name, methode, schema_version, state_json, qh_w, qhl_w, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
        )
        .bind(q.id, w.name, w.methode, w.schemaVersion, w.stateJson, w.qhW, w.qhlW, jetzt, jetzt)
        .run();
      if (r.meta?.changes === 1) return json(201, { ok: true, version: jetzt });
      const row = await lesen(db, q.id);
      return row ? konflikt(row) : serverfehler(new Error('Anlegen ohne Wirkung'), 'Projekt anlegen');
    }
    const version = neueVersion(w.basisVersion);
    const r = await db
      .prepare(
        `UPDATE heizlast_projekt SET name = ?, methode = ?, schema_version = ?, state_json = ?, qh_w = ?, qhl_w = ?, updated_at = ?
         WHERE id = ? AND updated_at = ?`,
      )
      .bind(w.name, w.methode, w.schemaVersion, w.stateJson, w.qhW, w.qhlW, version, q.id, w.basisVersion)
      .run();
    if (r.meta?.changes === 1) return json(200, { ok: true, version });
    const row = await lesen(db, q.id);
    return row ? konflikt(row) : fehler(404, 'Projekt nicht gefunden (in der Cloud gelöscht)');
  } catch (e) {
    return serverfehler(e, 'Projekt speichern');
  }
}

export async function onRequestDelete(context) {
  const v = await vorbereiten(context);
  if (v.antwort) return v.antwort;
  const url = new URL(context.request.url);
  const q = idAusUrl(context.request);
  if (!q.id) return fehler(400, q.ungueltig ? 'Ungültige Projekt-id' : 'Projekt-id fehlt');
  const version = url.searchParams.get('version');
  try {
    const r = version
      ? await v.db.prepare('DELETE FROM heizlast_projekt WHERE id = ? AND updated_at = ?').bind(q.id, version).run()
      : await v.db.prepare('DELETE FROM heizlast_projekt WHERE id = ?').bind(q.id).run();
    if (r.meta?.changes === 1) return json(200, { ok: true });
    const row = version ? await lesen(v.db, q.id) : null;
    return row ? fehler(409, 'Der Server-Stand ist neuer', { konflikt: { projekt: mitState(row) } }) : fehler(404, 'Projekt nicht gefunden');
  } catch (e) {
    return serverfehler(e, 'Projekt löschen');
  }
}
