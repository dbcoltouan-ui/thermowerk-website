/**
 * Projekte-Endpoint (Session 10; BUILD-08/12) gegen echtes SQLite: Anmeldung Pflicht, Validierung (id-Format,
 * ≤ 512 KB, gültiges JSON, Schemaversion ≤ aktuelle, meta.id = id), optimistisches Locking über updated_at
 * (409 mit Server-Stand), 404 bei unbekannter id, keine D1-Fehlertexte nach aussen.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { neueVersion, STATE_MAX_BYTES } from '../../../functions/api/heizlast-projekte.js';
import { SCHEMA_VERSION } from '../../src/state/version';
import type { TestBrowser } from './hilfen';
import { anfrage, d1, stand, TEST_PASSWORT, testServer } from './hilfen';

async function angemeldet(s = testServer()) {
  const b = s.browser();
  const r = await b.fetch('/api/heizlast-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: TEST_PASSWORT }) });
  expect(r.status).toBe(200);
  return { s, b };
}

const put = (b: TestBrowser, id: string, body: unknown, typ = 'application/json') =>
  b.fetch(`/api/heizlast-projekte?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': typ }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const speichern = (b: TestBrowser, id: string, state: unknown, basisVersion: string | null, extra: Record<string, unknown> = {}) => put(b, id, { stateJson: JSON.stringify(state), basisVersion, ...extra });

describe('Anmeldung Pflicht', () => {
  it('ohne Cookie: GET, PUT, DELETE → 401', async () => {
    const s = testServer();
    expect((await s.bearbeiten(anfrage('/api/heizlast-projekte'))).status).toBe(401);
    expect((await s.bearbeiten(anfrage('/api/heizlast-projekte?id=p-1', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' }))).status).toBe(401);
    expect((await s.bearbeiten(anfrage('/api/heizlast-projekte?id=p-1', { method: 'DELETE' }))).status).toBe(401);
  });
});

describe('Anlegen, Liste, Laden', () => {
  it('PUT neu → 201 mit Version; Liste ohne State mit Kennzahlen; Laden liefert den State unverändert', async () => {
    const { b } = await angemeldet();
    const st = { ...stand('p-abc123', 'EFH Muster'), beliebig: { tief: [1, 2, 3] } };
    const r = await speichern(b, 'p-abc123', st, null, { qhW: 10730.5, qhlW: 9304.7 });
    expect(r.status).toBe(201);
    const { version } = (await r.json()) as { version: string };
    expect(Date.parse(version)).toBeGreaterThan(0);

    const liste = (await (await b.fetch('/api/heizlast-projekte')).json()) as { projekte: Array<Record<string, unknown>> };
    expect(liste.projekte).toEqual([{ id: 'p-abc123', name: 'EFH Muster', methode: 'fws', schemaVersion: 4, qhW: 10730.5, qhlW: 9304.7, erstellt: version, version }]);
    expect(liste.projekte[0]).not.toHaveProperty('stateJson');

    const ein = (await (await b.fetch('/api/heizlast-projekte?id=p-abc123')).json()) as { projekt: { stateJson: string; version: string } };
    expect(JSON.parse(ein.projekt.stateJson)).toEqual(st);
    expect(ein.projekt.version).toBe(version);
  });

  it('unbekannte id → 404 (kein «success:true, project:null» mehr, BUILD-12)', async () => {
    const { b } = await angemeldet();
    const r = await b.fetch('/api/heizlast-projekte?id=p-gibtsnicht');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ ok: false, fehler: 'Projekt nicht gefunden' });
  });

  it('Liste neueste zuerst', async () => {
    const { b } = await angemeldet();
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(Date.parse('2026-10-30T08:00:00Z'));
      await speichern(b, 'p-alt', stand('p-alt', 'Alt'), null);
      vi.setSystemTime(Date.parse('2026-10-30T09:00:00Z'));
      await speichern(b, 'p-neu', stand('p-neu', 'Neu'), null);
    } finally {
      vi.useRealTimers();
    }
    const l = (await (await b.fetch('/api/heizlast-projekte')).json()) as { projekte: Array<{ id: string }> };
    expect(l.projekte.map((p) => p.id)).toEqual(['p-neu', 'p-alt']);
  });
});

describe('Optimistisches Locking über updated_at (BUILD-08)', () => {
  let b: TestBrowser;
  let v1: string;
  beforeEach(async () => {
    ({ b } = await angemeldet());
    v1 = ((await (await speichern(b, 'p-lock', stand('p-lock', 'Version 1'), null)).json()) as { version: string }).version;
  });

  it('Speichern mit aktueller Version → 200, neue Version streng grösser', async () => {
    const r = await speichern(b, 'p-lock', stand('p-lock', 'Version 2'), v1);
    expect(r.status).toBe(200);
    const { version: v2 } = (await r.json()) as { version: string };
    expect(v2 > v1).toBe(true);
  });

  it('zwei Geräte: das zweite mit veralteter Version → 409 mit Server-Stand; nichts überschrieben', async () => {
    const v2 = ((await (await speichern(b, 'p-lock', stand('p-lock', 'Gerät A'), v1)).json()) as { version: string }).version;
    const r = await speichern(b, 'p-lock', stand('p-lock', 'Gerät B'), v1);
    expect(r.status).toBe(409);
    const k = (await r.json()) as { ok: boolean; konflikt: { projekt: { version: string; name: string; stateJson: string } } };
    expect(k.ok).toBe(false);
    expect(k.konflikt.projekt).toMatchObject({ version: v2, name: 'Gerät A' });
    expect(JSON.parse(k.konflikt.projekt.stateJson).projekt.name).toBe('Gerät A');
    // Überschreiben bewusst mit der Server-Version
    expect((await speichern(b, 'p-lock', stand('p-lock', 'Gerät B'), v2)).status).toBe(200);
  });

  it('Anlegen (basisVersion null) auf bestehender id → 409', async () => {
    const r = await speichern(b, 'p-lock', stand('p-lock', 'neu?'), null);
    expect(r.status).toBe(409);
  });

  it('Ändern eines in der Cloud gelöschten Projekts → 404', async () => {
    expect((await b.fetch('/api/heizlast-projekte?id=p-lock', { method: 'DELETE' })).status).toBe(200);
    const r = await speichern(b, 'p-lock', stand('p-lock'), v1);
    expect(r.status).toBe(404);
  });

  it('Löschen mit veralteter Version → 409, mit aktueller → 200, danach 404', async () => {
    const v2 = ((await (await speichern(b, 'p-lock', stand('p-lock', 'neuer'), v1)).json()) as { version: string }).version;
    expect((await b.fetch(`/api/heizlast-projekte?id=p-lock&version=${encodeURIComponent(v1)}`, { method: 'DELETE' })).status).toBe(409);
    expect((await b.fetch(`/api/heizlast-projekte?id=p-lock&version=${encodeURIComponent(v2)}`, { method: 'DELETE' })).status).toBe(200);
    expect((await b.fetch('/api/heizlast-projekte?id=p-lock', { method: 'DELETE' })).status).toBe(404);
  });

  it('zwei Speichervorgänge in derselben Millisekunde bleiben unterscheidbar', () => {
    const t = Date.parse('2026-10-30T12:00:00.000Z');
    const a = neueVersion(null, t);
    const b2 = neueVersion(a, t);
    const c = neueVersion(b2, t);
    expect([a, b2, c]).toEqual(['2026-10-30T12:00:00.000Z', '2026-10-30T12:00:00.001Z', '2026-10-30T12:00:00.002Z']);
    expect(neueVersion('2026-10-30T11:00:00.000Z', t)).toBe('2026-10-30T12:00:00.000Z');
  });
});

describe('Validierung', () => {
  let b: TestBrowser;
  beforeEach(async () => {
    ({ b } = await angemeldet());
  });

  it.each(['../etc', 'a', 'mit leerzeichen', 'x'.repeat(65), 'ä-umlaut', '-start'])('ungültige id «%s» → 400', async (id) => {
    const r = await speichern(b, id, stand(id), null);
    expect(r.status).toBe(400);
  });

  it('stateJson kein JSON → 400; kein Objekt → 400; fehlt → 400', async () => {
    expect((await put(b, 'p-v', { stateJson: '{kaputt', basisVersion: null })).status).toBe(400);
    expect((await put(b, 'p-v', { stateJson: '[1,2]', basisVersion: null })).status).toBe(400);
    expect((await put(b, 'p-v', { basisVersion: null })).status).toBe(400);
  });

  it('grösser als 512 KB → 413; knapp darunter → 201', async () => {
    const gross = { ...stand('p-gross'), fuell: 'x'.repeat(STATE_MAX_BYTES) };
    expect((await speichern(b, 'p-gross', gross, null)).status).toBe(413);
    const basis = JSON.stringify({ ...stand('p-knapp'), fuell: '' }).length;
    const knapp = { ...stand('p-knapp'), fuell: 'x'.repeat(STATE_MAX_BYTES - basis) };
    expect(new TextEncoder().encode(JSON.stringify(knapp)).length).toBe(STATE_MAX_BYTES);
    expect((await speichern(b, 'p-knapp', knapp, null)).status).toBe(201);
  });

  it('Umlaute zählen in Bytes (UTF-8), nicht in Zeichen', async () => {
    const basis = JSON.stringify({ ...stand('p-utf'), fuell: '' }).length;
    const st = { ...stand('p-utf'), fuell: 'ä'.repeat(Math.ceil((STATE_MAX_BYTES - basis) / 2) + 1) };
    expect((await speichern(b, 'p-utf', st, null)).status).toBe(413);
  });

  it(`Schemaversion: neuer als ${SCHEMA_VERSION} → 400; ältere (2) erlaubt; fehlt → 400`, async () => {
    const r = await speichern(b, 'p-sv', stand('p-sv', 'x', SCHEMA_VERSION + 1), null);
    expect(r.status).toBe(400);
    expect(((await r.json()) as { fehler: string }).fehler).toContain('neuer');
    expect((await speichern(b, 'p-sv2', stand('p-sv2', 'alt', 2), null)).status).toBe(201);
    expect((await speichern(b, 'p-sv3', { projekt: { name: 'ohne meta' } }, null)).status).toBe(400);
    expect((await speichern(b, 'p-sv4', { meta: { schemaVersion: '4', id: 'p-sv4' } }, null)).status).toBe(400);
  });

  it('meta.id passt nicht zur Adresse → 400', async () => {
    expect((await speichern(b, 'p-eins', stand('p-zwei'), null)).status).toBe(400);
  });

  it('basisVersion kein Datum → 400; Kennzahlen kein Zahlwert → 400', async () => {
    expect((await speichern(b, 'p-bv', stand('p-bv'), 'gestern')).status).toBe(400);
    expect((await speichern(b, 'p-kz', stand('p-kz'), null, { qhW: 'viel' })).status).toBe(400);
  });

  it('kein JSON-Content-Type → 415 (kein Formular-CSRF)', async () => {
    expect((await put(b, 'p-ct', { stateJson: JSON.stringify(stand('p-ct')), basisVersion: null }, 'text/plain')).status).toBe(415);
  });

  it('Name wird aus dem State gelesen und gekürzt; unbekannte Methode → null', async () => {
    const st = { ...stand('p-name', `  ${'N'.repeat(300)}  `), methode: 'quatsch' };
    await speichern(b, 'p-name', st, null);
    const l = (await (await b.fetch('/api/heizlast-projekte')).json()) as { projekte: Array<{ name: string; methode: unknown }> };
    expect(l.projekte[0]!.name).toHaveLength(200);
    expect(l.projekte[0]!.methode).toBeNull();
  });
});

describe('D1-Fehler gehen nicht nach aussen', () => {
  it('Liste bei defekter Tabelle → 500 «Serverfehler» ohne SQLite-Text', async () => {
    const db = d1({
      vorher: (sql) => {
        if (sql.startsWith('SELECT id, name')) throw new Error('D1_ERROR: no such column: geheim');
      },
    });
    const { b } = await angemeldet(testServer({ db }));
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await b.fetch('/api/heizlast-projekte');
    fehler.mockRestore();
    expect(r.status).toBe(500);
    const t = await r.text();
    expect(t).not.toMatch(/D1_ERROR|geheim|column/);
    expect(JSON.parse(t)).toMatchObject({ ok: false, fehler: 'Serverfehler' });
  });
});
