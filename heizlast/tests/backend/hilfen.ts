/**
 * Test-Hilfen Backend (Session 10): D1-Ersatz auf echtem SQLite (`node:sqlite`) und ein Test-Server, der
 * Anfragen an die Pages Functions weiterreicht — mit Cookie-Speicher je «Browser» und eigener IP.
 * Dieselben Hilfen nutzt der Playwright-Test `e2e/cloud.spec.ts` (zwei Browser, ein Server).
 */
import { DatabaseSync } from 'node:sqlite';
import * as auth from '../../../functions/api/heizlast-auth.js';
import * as projekte from '../../../functions/api/heizlast-projekte.js';

type Wert = string | number | null;

/** Anweisung im Stil von D1 (`prepare(sql).bind(...).first()/all()/run()`). */
export class D1Anweisung {
  constructor(
    private readonly db: DatabaseSync,
    readonly sql: string,
    private readonly args: Wert[] = [],
    private readonly vorher?: (sql: string) => void,
  ) {}
  bind(...args: Wert[]) {
    return new D1Anweisung(this.db, this.sql, args, this.vorher);
  }
  ausfuehren() {
    this.vorher?.(this.sql);
    const r = this.db.prepare(this.sql).run(...this.args);
    return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  async first<T = Record<string, unknown>>(): Promise<T | null> {
    this.vorher?.(this.sql);
    return (this.db.prepare(this.sql).get(...this.args) as T | undefined) ?? null;
  }
  async all<T = Record<string, unknown>>() {
    this.vorher?.(this.sql);
    return { success: true, results: this.db.prepare(this.sql).all(...this.args) as T[], meta: {} };
  }
  async run() {
    return this.ausfuehren();
  }
}

export interface D1Ersatz {
  roh: DatabaseSync;
  prepare(sql: string): D1Anweisung;
  batch(anweisungen: D1Anweisung[]): Promise<unknown[]>;
}

/** Leere Datenbank; `vorher` darf werfen (simulierter D1-Fehler). */
export function d1(o: { vorher?: (sql: string) => void } = {}): D1Ersatz {
  const roh = new DatabaseSync(':memory:');
  return {
    roh,
    prepare: (sql) => new D1Anweisung(roh, sql, [], o.vorher),
    async batch(anweisungen) {
      roh.exec('BEGIN');
      try {
        const r = anweisungen.map((a) => a.ausfuehren());
        roh.exec('COMMIT');
        return r;
      } catch (e) {
        roh.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

export const TEST_PASSWORT = 'test-passwort-lokal-123';
export const TEST_SECRET = 'test-secret-nur-fuer-tests-0123456789abcdefghij';

type Handler = (c: { request: Request; env: Record<string, unknown> }) => Promise<Response>;
const ROUTEN: Record<string, Record<string, unknown>> = { '/api/heizlast-auth': auth, '/api/heizlast-projekte': projekte };

export interface TestBrowser {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  cookies: Map<string, string>;
}

export function testServer(o: { env?: Record<string, unknown>; db?: D1Ersatz } = {}) {
  const db = o.db ?? d1();
  const env: Record<string, unknown> = { HEIZLAST_PASSWORD: TEST_PASSWORT, HEIZLAST_COOKIE_SECRET: TEST_SECRET, DB: db, ...o.env };

  async function bearbeiten(request: Request): Promise<Response> {
    const mod = ROUTEN[new URL(request.url).pathname];
    if (!mod) return new Response('Not found', { status: 404 });
    const m = request.method.toUpperCase();
    const fn = mod[`onRequest${m[0]}${m.slice(1).toLowerCase()}`] as Handler | undefined;
    if (!fn) return new Response(null, { status: 405 });
    return fn({ request, env });
  }

  /** Ein Browser mit eigenem Cookie-Speicher und eigener IP (`CF-Connecting-IP`). */
  function browser(ip = '203.0.113.10'): TestBrowser {
    const cookies = new Map<string, string>();
    const fetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);
      if (cookies.size) headers.set('Cookie', [...cookies].map(([k, v]) => `${k}=${v}`).join('; '));
      headers.set('CF-Connecting-IP', ip);
      const { credentials: _c, cache: _k, ...rest } = init;
      const res = await bearbeiten(new Request(new URL(url, 'https://thermowerk.test'), { ...rest, headers }));
      const sc = res.headers.get('Set-Cookie');
      if (sc) {
        const [paar, ...attr] = sc.split(';');
        const i = paar!.indexOf('=');
        const name = paar!.slice(0, i).trim();
        if (attr.some((a) => a.trim().toLowerCase() === 'max-age=0')) cookies.delete(name);
        else cookies.set(name, paar!.slice(i + 1).trim());
      }
      return res;
    };
    return { fetch, cookies };
  }

  return { db, env, bearbeiten, browser };
}

/** Anfrage an einen Handler mit beliebigen Kopfzeilen (für gefälschte Cookies usw.). */
export function anfrage(pfad: string, init: RequestInit & { cookie?: string; ip?: string } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.cookie !== undefined) headers.set('Cookie', init.cookie);
  headers.set('CF-Connecting-IP', init.ip ?? '198.51.100.7');
  const { cookie: _c, ip: _i, ...rest } = init;
  return new Request(new URL(pfad, 'https://thermowerk.test'), { ...rest, headers });
}

/** Minimaler gültiger Stand für den Server (Schema-Version, id) — der Server prüft nur das. */
export function stand(id: string, name = 'Testprojekt', schemaVersion = 4): Record<string, unknown> {
  return { meta: { schemaVersion, id, erstellt: '2026-10-30T10:00:00.000Z', geaendert: '2026-10-30T10:00:00.000Z' }, projekt: { name }, methode: 'fws' };
}
