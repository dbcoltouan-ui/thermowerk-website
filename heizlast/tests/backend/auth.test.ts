/**
 * Anmeldung (Session 10; BUILD-06/07) gegen echtes SQLite: signiertes Cookie mit Ablauf, Sitzung in D1 mit
 * Widerruf, gefälschte/abgelaufene/manipulierte Cookies abgelehnt, zeitkonstanter Passwortvergleich, Sperre
 * 5 Fehlversuche / 15 min je Absender, fehlende Konfiguration mit Klartext, keine Klartext-IP in D1.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as projekteAlt from '../../../functions/api/heizlast-projects.js';
import { COOKIE_NAME, LAUFZEIT_S, passwortGleich, tokenErzeugen, tokenPruefen } from '../../../functions/_lib/heizlast-sitzung.js';
import { anfrage, d1, TEST_PASSWORT, TEST_SECRET, testServer } from './hilfen';

const START = Date.parse('2026-10-30T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
});
afterEach(() => vi.useRealTimers());

const login = (b: { fetch: (u: string, i?: RequestInit) => Promise<Response> }, passwort: string) =>
  b.fetch('/api/heizlast-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwort }) });
const probe = async (s: ReturnType<typeof testServer>, cookie?: string) => (await s.bearbeiten(anfrage('/api/heizlast-auth', cookie === undefined ? {} : { cookie }))).json();

describe('Login und Cookie', () => {
  it('richtiges Passwort → 200, signiertes Cookie (HttpOnly, Secure, SameSite, 30 Tage), Sitzung in D1', async () => {
    const s = testServer();
    const b = s.browser();
    const r = await login(b, TEST_PASSWORT);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ success: true, ablauf: new Date(START + LAUFZEIT_S * 1000).toISOString() });
    const sc = r.headers.get('Set-Cookie')!;
    expect(sc).toMatch(/^tw_heizlast_auth=v1\.[A-Za-z0-9_-]{24}\.\d+\.[A-Za-z0-9_-]{43};/);
    for (const a of ['Path=/', 'Max-Age=2592000', 'HttpOnly', 'Secure', 'SameSite=Lax']) expect(sc).toContain(a);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const sitzungen = s.db.roh.prepare('SELECT * FROM heizlast_sitzung').all();
    expect(sitzungen).toHaveLength(1);
    expect((await (await b.fetch('/api/heizlast-auth')).json()).authed).toBe(true);
  });

  it('falsches Passwort → 401 ohne Cookie', async () => {
    const r = await login(testServer().browser(), 'falsch');
    expect(r.status).toBe(401);
    expect(r.headers.get('Set-Cookie')).toBeNull();
    expect(await r.json()).toEqual({ success: false, error: 'Falsches Passwort' });
  });

  it('Body ohne Passwort → 400', async () => {
    const s = testServer();
    const r = await s.bearbeiten(anfrage('/api/heizlast-auth', { method: 'POST', body: 'kein json' }));
    expect(r.status).toBe(400);
  });
});

describe('Cookie-Prüfung (BUILD-06): nur signiert, nicht abgelaufen, Sitzung gültig', () => {
  it('gefälschtes Cookie «x» → nicht angemeldet; Projekte → 401 (neu und alt)', async () => {
    const s = testServer();
    expect(await probe(s, `${COOKIE_NAME}=x`)).toEqual({ authed: false });
    const neu = await s.bearbeiten(anfrage('/api/heizlast-projekte', { cookie: `${COOKIE_NAME}=x` }));
    expect(neu.status).toBe(401);
    const alt = await projekteAlt.onRequestGet({ request: anfrage('/api/heizlast-projects', { cookie: `${COOKIE_NAME}=x` }), env: s.env });
    expect(alt!.status).toBe(401);
  });

  it('Teilstring-Trick (xyz_tw_heizlast_auth=…) zählt nicht, auch mit gültigem Wert', async () => {
    const s = testServer();
    const b = s.browser();
    await login(b, TEST_PASSWORT);
    const token = b.cookies.get(COOKIE_NAME)!;
    expect(await probe(s, `${COOKIE_NAME}=${token}`)).toMatchObject({ authed: true });
    expect(await probe(s, `xyz_${COOKIE_NAME}=${token}`)).toEqual({ authed: false });
  });

  it('manipulierte Signatur bzw. verlängerter Ablauf → abgelehnt', async () => {
    const s = testServer();
    const b = s.browser();
    await login(b, TEST_PASSWORT);
    const [v, id, ablauf, sig] = b.cookies.get(COOKIE_NAME)!.split('.');
    const andereSig = (sig![0] === 'A' ? 'B' : 'A') + sig!.slice(1);
    expect(await probe(s, `${COOKIE_NAME}=${v}.${id}.${ablauf}.${andereSig}`)).toEqual({ authed: false });
    expect(await probe(s, `${COOKIE_NAME}=${v}.${id}.${Number(ablauf) + 86400}.${sig}`)).toEqual({ authed: false });
  });

  it('mit anderem Secret signiert → abgelehnt', async () => {
    const s = testServer();
    const fremd = await tokenErzeugen('ein-anderes-secret-mit-ausreichender-laenge-1234', 'AAAAAAAAAAAAAAAAAAAAAAAA', Math.floor(START / 1000) + 3600);
    expect(await probe(s, `${COOKIE_NAME}=${fremd}`)).toEqual({ authed: false });
  });

  it('abgelaufen (nach 30 Tagen) → abgelehnt', async () => {
    const s = testServer();
    const b = s.browser();
    await login(b, TEST_PASSWORT);
    vi.setSystemTime(START + (LAUFZEIT_S - 60) * 1000);
    expect((await (await b.fetch('/api/heizlast-auth')).json()).authed).toBe(true);
    vi.setSystemTime(START + (LAUFZEIT_S + 1) * 1000);
    expect((await (await b.fetch('/api/heizlast-auth')).json()).authed).toBe(false);
    expect((await b.fetch('/api/heizlast-projekte')).status).toBe(401);
  });

  it('gültig signiert, aber keine Sitzung in D1 → abgelehnt', async () => {
    const s = testServer();
    const token = await tokenErzeugen(TEST_SECRET, 'BBBBBBBBBBBBBBBBBBBBBBBB', Math.floor(START / 1000) + 3600);
    expect(await tokenPruefen(TEST_SECRET, token, Math.floor(START / 1000))).toMatchObject({ ok: true });
    expect(await probe(s, `${COOKIE_NAME}=${token}`)).toEqual({ authed: false });
  });

  it('Abmelden widerruft die Sitzung: altes Cookie gilt danach nicht mehr', async () => {
    const s = testServer();
    const b = s.browser();
    await login(b, TEST_PASSWORT);
    const token = b.cookies.get(COOKIE_NAME)!;
    const r = await b.fetch('/api/heizlast-auth', { method: 'DELETE' });
    expect(r.status).toBe(200);
    expect(r.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect(b.cookies.has(COOKIE_NAME)).toBe(false);
    // Wer das Cookie vorher kopiert hat, kommt nicht mehr hinein.
    expect(await probe(s, `${COOKIE_NAME}=${token}`)).toEqual({ authed: false });
    expect(s.db.roh.prepare('SELECT revoked_at FROM heizlast_sitzung').get()).toMatchObject({ revoked_at: new Date(START).toISOString() });
  });
});

describe('Sperre nach Fehlversuchen (BUILD-07): 5 je 15 min und Absender', () => {
  it('5 Fehlversuche → 429 auch mit richtigem Passwort; andere IP frei; nach 15 min wieder frei', async () => {
    const s = testServer();
    const a = s.browser('203.0.113.1');
    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(START + i * 1000);
      expect((await login(a, 'falsch')).status).toBe(401);
    }
    const gesperrt = await login(a, TEST_PASSWORT);
    expect(gesperrt.status).toBe(429);
    const sperre = (await gesperrt.json()) as { wartenS: number; error: string };
    expect(sperre.wartenS).toBeGreaterThan(14 * 60);
    expect(sperre.wartenS).toBeLessThanOrEqual(15 * 60);
    expect(sperre.error).toContain('Minuten');
    expect(gesperrt.headers.get('Retry-After')).toBe(String(sperre.wartenS));

    expect((await login(s.browser('203.0.113.2'), TEST_PASSWORT)).status).toBe(200);

    vi.setSystemTime(START + 15 * 60 * 1000 + 1000);
    expect((await login(a, TEST_PASSWORT)).status).toBe(200);
  });

  it('erfolgreiche Anmeldung setzt den Zähler zurück', async () => {
    const s = testServer();
    const a = s.browser('203.0.113.3');
    for (let i = 0; i < 4; i++) await login(a, 'falsch');
    expect((await login(a, TEST_PASSWORT)).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await login(a, 'falsch')).status).toBe(401);
    expect((await login(a, TEST_PASSWORT)).status).toBe(200);
  });

  it('keine Klartext-IP in der Datenbank', async () => {
    const s = testServer();
    await login(s.browser('203.0.113.99'), 'falsch');
    const zeilen = s.db.roh.prepare('SELECT key_hash FROM login_attempts').all() as Array<{ key_hash: string }>;
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]!.key_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(zeilen[0]!.key_hash).not.toContain('203.0.113.99');
  });
});

describe('Passwortvergleich über Hash (zeitkonstant)', () => {
  it('gleich / ungleich / verschiedene Länge / kein Text', async () => {
    expect(await passwortGleich('geheim', 'geheim')).toBe(true);
    expect(await passwortGleich('geheim', 'Geheim')).toBe(false);
    expect(await passwortGleich('geheim', 'geheim-und-viel-laenger')).toBe(false);
    expect(await passwortGleich('', 'x')).toBe(false);
    expect(await passwortGleich(undefined as unknown as string, 'x')).toBe(false);
  });
});

describe('Konfiguration fehlt → 500 mit Klartext, keine stille Öffnung', () => {
  it('ohne HEIZLAST_COOKIE_SECRET: Login, Probe und Projekte 500', async () => {
    const s = testServer({ env: { HEIZLAST_COOKIE_SECRET: undefined } });
    const r = await login(s.browser(), TEST_PASSWORT);
    expect(r.status).toBe(500);
    expect(((await r.json()) as { error: string }).error).toBe('Server-Konfiguration fehlt (HEIZLAST_COOKIE_SECRET)');
    expect((await s.bearbeiten(anfrage('/api/heizlast-auth'))).status).toBe(500);
    expect((await s.bearbeiten(anfrage('/api/heizlast-projekte'))).status).toBe(500);
  });
  it('zu kurzes Secret gilt als fehlend', async () => {
    const r = await login(testServer({ env: { HEIZLAST_COOKIE_SECRET: 'kurz' } }).browser(), TEST_PASSWORT);
    expect(r.status).toBe(500);
  });
  it('ohne HEIZLAST_PASSWORD: Login 500', async () => {
    const r = await login(testServer({ env: { HEIZLAST_PASSWORD: undefined } }).browser(), TEST_PASSWORT);
    expect(((await r.json()) as { error: string }).error).toBe('Server-Konfiguration fehlt (HEIZLAST_PASSWORD)');
  });
});

describe('Datenbankfehler: kein D1-Text nach aussen', () => {
  it('Login bei defekter D1 → 500 «Serverfehler»', async () => {
    const kaputt = d1({
      vorher: (sql) => {
        if (sql.includes('login_attempts')) throw new Error('D1_ERROR: SQLITE_BUSY geheimes Detail');
      },
    });
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await login(testServer({ db: kaputt }).browser(), TEST_PASSWORT);
    expect(r.status).toBe(500);
    const text = await r.text();
    expect(text).not.toContain('SQLITE');
    expect(text).toContain('Serverfehler');
    fehler.mockRestore();
  });
});

describe('Altes Tool (bis Go-Live): gleiche Antwortform', () => {
  it('POST/GET/DELETE liefern success/authed wie bisher; alte Projekte nur mit gültiger Sitzung', async () => {
    const s = testServer();
    const b = s.browser();
    expect(await (await login(b, TEST_PASSWORT)).json()).toMatchObject({ success: true });
    expect(await (await b.fetch('/api/heizlast-auth')).json()).toMatchObject({ authed: true });
    s.db.roh.exec(`CREATE TABLE heizlast_project (id TEXT PRIMARY KEY, project_name TEXT, customer_name TEXT, address TEXT, qhl REAL, qh REAL, ebf REAL, state_json TEXT, status TEXT, notes TEXT, created_at TEXT, updated_at TEXT)`);
    const cookie = `${COOKIE_NAME}=${b.cookies.get(COOKIE_NAME)}`;
    const alt = await projekteAlt.onRequestGet({ request: anfrage('/api/heizlast-projects', { cookie }), env: s.env });
    expect(alt!.status).toBe(200);
    expect(await alt!.json()).toMatchObject({ success: true, projects: [] });
    expect(await (await b.fetch('/api/heizlast-auth', { method: 'DELETE' })).json()).toEqual({ success: true });
  });
});

