/**
 * Cloud-Sync (Session 10) Ende-zu-Ende in Vitest: echter Client (`erstelleCloud` + Projektverwaltung) gegen die
 * echten Pages Functions auf SQLite (Test-Server mit Cookie-Speicher je Gerät). Zwei Geräte → Konflikt mit
 * «überschreiben» bzw. «Kopie»; Drift wird nur markiert (BUILD-09); offline und abgelaufene Anmeldung sichtbar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { alleDaten } from '../../src/daten/index';
import type { CloudEintrag, FetchFn } from '../../src/state/cloud';
import { erstelleCloud } from '../../src/state/cloud';
import type { ProjektEintrag, Speicher } from '../../src/state/persistenz';
import { driftMarkieren, erstelleProjektverwaltung, projektListe, projektZeilen, stateHash } from '../../src/state/persistenz';
import { erstelleStore } from '../../src/state/store';
import { TEST_PASSWORT, testServer } from '../backend/hilfen';

const daten = alleDaten();

function speicher(): Speicher {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

/** Ein Gerät: eigener Store, eigener localStorage, eigener Browser (Cookies) am gemeinsamen Server. */
function geraet(server: ReturnType<typeof testServer>, name: string, o: { online?: () => boolean; fetch?: FetchFn } = {}) {
  let n = 0;
  let t = Date.UTC(2026, 9, 30, 9, 0, 0);
  const store = erstelleStore({ daten, uhr: () => new Date((t += 1000)).toISOString(), neueId: (p) => `${p}-${name}${++n}` });
  const sp = speicher();
  const browser = server.browser(name === 'a' ? '203.0.113.21' : '203.0.113.22');
  const cloud = erstelleCloud({ fetch: o.fetch ?? browser.fetch, ...(o.online ? { online: o.online } : {}) });
  const v = erstelleProjektverwaltung({ store, speicher: sp, bestaetigen: () => true, cloud });
  return { store, sp, browser, v };
}

const offen: Array<{ v: { stoppen(): void } }> = [];
afterEach(() => {
  for (const g of offen.splice(0)) g.v.stoppen();
});

async function gestartet(server: ReturnType<typeof testServer>, name: string, o?: Parameters<typeof geraet>[2]) {
  const g = geraet(server, name, o);
  offen.push(g);
  g.v.starten();
  await g.v.cloudFertig();
  return g;
}

async function angemeldet(server: ReturnType<typeof testServer>, name: string, o?: Parameters<typeof geraet>[2]) {
  const g = await gestartet(server, name, o);
  expect(await g.v.anmelden(TEST_PASSWORT)).toEqual({ ok: true });
  await g.v.cloudFertig();
  return g;
}

const zeile = (g: { v: ReturnType<typeof erstelleProjektverwaltung> }, id: string) => g.v.zeilen.value.find((z) => z.id === id);
/** Projekte in der Server-Datenbank (die Tabelle entsteht erst beim ersten Zugriff einer Function). */
const serverListe = (server: ReturnType<typeof testServer>) =>
  server.db.roh.prepare("SELECT name FROM sqlite_master WHERE name = 'heizlast_projekt'").get()
    ? (server.db.roh.prepare('SELECT id, name FROM heizlast_projekt ORDER BY id').all() as Array<{ id: string; name: string }>)
    : [];

describe('Adapter: Antworten → Status', () => {
  it('nicht angemeldet → «abgemeldet»; falsches Passwort → «falsch»; 5 Fehlversuche → «gesperrt» mit Wartezeit', async () => {
    const s = testServer();
    const c = erstelleCloud({ fetch: s.browser().fetch });
    expect(await c.pruefen()).toMatchObject({ status: 'abgemeldet' });
    expect(await c.anmelden('falsch')).toMatchObject({ ok: false, art: 'falsch' });
    for (let i = 0; i < 4; i++) await c.anmelden('falsch');
    const r = await c.anmelden(TEST_PASSWORT);
    expect(r).toMatchObject({ ok: false, art: 'gesperrt' });
    expect(!r.ok && r.wartenS).toBeGreaterThan(0);
  });
  it('Netz weg → «offline»; Browser offline → «offline» ohne Anfrage', async () => {
    const kaputt: FetchFn = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await erstelleCloud({ fetch: kaputt }).pruefen()).toMatchObject({ status: 'offline' });
    const zaehler = vi.fn(kaputt);
    expect(await erstelleCloud({ fetch: zaehler, online: () => false }).liste()).toMatchObject({ ok: false, art: 'offline' });
    expect(zaehler).not.toHaveBeenCalled();
  });
  it('kein Backend (404 HTML, z. B. lokale Vorschau) → «fehler» mit Klartext', async () => {
    const html: FetchFn = async () => new Response('<html>', { status: 404, headers: { 'Content-Type': 'text/html' } });
    expect(await erstelleCloud({ fetch: html }).pruefen()).toEqual({ status: 'fehler', text: 'Cloud nicht erreichbar (HTTP 404).' });
  });
  it('Server ohne Secret → «fehler» mit der Meldung des Servers', async () => {
    const s = testServer({ env: { HEIZLAST_COOKIE_SECRET: undefined } });
    expect(await erstelleCloud({ fetch: s.browser().fetch }).pruefen()).toEqual({ status: 'fehler', text: 'Cloud-Fehler: Server-Konfiguration fehlt (HEIZLAST_COOKIE_SECRET)' });
  });
});

describe('Zwei Geräte über denselben Server', () => {
  it('Speichern lädt hoch; zweites Gerät sieht «nur in der Cloud» und öffnet den Stand', async () => {
    const s = testServer();
    const a = await angemeldet(s, 'a');
    expect(a.v.cloudStatus.value).toBe('angemeldet');
    a.store.setze('projekt.name', 'EFH Sonnenweg');
    a.store.setzeMethode('fws');
    expect(a.v.speichern()).toEqual({ ok: true });
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    expect(zeile(a, id)?.cloud).toBe('synchron');
    expect(a.v.cloudAnzeige.value).toBe('angemeldet');
    expect(serverListe(s)).toEqual([{ id, name: 'EFH Sonnenweg' }]);

    const b = await angemeldet(s, 'b');
    expect(zeile(b, id)).toMatchObject({ lokal: false, cloud: 'nurCloud', name: 'EFH Sonnenweg' });
    expect(await b.v.laden(id)).toBe(true);
    expect(b.store.state.value.projekt.name).toBe('EFH Sonnenweg');
    expect(b.store.state.value.methode).toBe('fws');
    expect(zeile(b, id)).toMatchObject({ lokal: true, cloud: 'synchron' });
    expect(b.v.status.value).toBe('gespeichert');
  });

  it('Konflikt → «überschreiben»: mein Stand gilt, anderes Gerät sieht «Server neuer» und lädt ihn', async () => {
    const s = testServer();
    const a = await angemeldet(s, 'a');
    a.store.setze('projekt.name', 'Haus');
    a.v.speichern();
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    const b = await angemeldet(s, 'b');
    await b.v.laden(id);

    b.store.setze('projekt.name', 'Haus (B)');
    b.v.speichern();
    await b.v.cloudFertig();
    a.store.setze('projekt.name', 'Haus (A)');
    a.v.speichern();
    await a.v.cloudFertig();
    expect(a.v.konflikt.value).toMatchObject({ id, name: 'Haus (A)', serverName: 'Haus (B)' });
    expect(a.v.cloudAnzeige.value).toBe('konflikt');
    expect(serverListe(s)).toEqual([{ id, name: 'Haus (B)' }]);

    await a.v.konfliktLoesen('ueberschreiben');
    await a.v.cloudFertig();
    expect(a.v.konflikt.value).toBeNull();
    expect(serverListe(s)).toEqual([{ id, name: 'Haus (A)' }]);
    expect(zeile(a, id)?.cloud).toBe('synchron');

    await b.v.cloudAbgleichen();
    expect(zeile(b, id)?.cloud).toBe('serverNeuer');
    expect(await b.v.laden(id)).toBe(true);
    expect(b.store.state.value.projekt.name).toBe('Haus (A)');
    expect(b.v.ladeMeldungen.value[0]).toBe('Neuerer Stand aus der Cloud geladen.');
    expect(zeile(b, id)?.cloud).toBe('synchron');
  });

  it('Konflikt → «Kopie»: mein Stand wird neues Projekt, Original zeigt den Server-Stand; beides in der Cloud', async () => {
    const s = testServer();
    const a = await angemeldet(s, 'a');
    a.store.setze('projekt.name', 'Villa');
    a.v.speichern();
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    const b = await angemeldet(s, 'b');
    await b.v.laden(id);
    b.store.setze('gebaeude.baujahr', 1971);
    b.v.speichern();
    await b.v.cloudFertig();

    a.store.setze('gebaeude.baujahr', 1985);
    a.v.speichern();
    await a.v.cloudFertig();
    expect(a.v.konflikt.value?.id).toBe(id);
    await a.v.konfliktLoesen('kopie');
    await a.v.cloudFertig();

    const kopieId = a.store.state.value.meta.id;
    expect(kopieId).not.toBe(id);
    expect(a.store.state.value.projekt.name).toBe('Villa (Kopie)');
    expect(a.store.state.value.gebaeude.baujahr).toBe(1985);
    expect(a.v.status.value).toBe('gespeichert');
    const original = projektListe(a.sp).find((e) => e.id === id)!;
    expect((original.state as { gebaeude: { baujahr: number } }).gebaeude.baujahr).toBe(1971);
    expect(zeile(a, id)?.cloud).toBe('synchron');
    expect(zeile(a, kopieId)?.cloud).toBe('synchron');
    expect(serverListe(s).map((p) => p.name).sort()).toEqual(['Villa', 'Villa (Kopie)']);
    expect(a.v.ladeMeldungen.value[0]).toContain('Konflikt gelöst');
  });

  it('«Später»: nichts überschrieben, Zustand bleibt sichtbar; nächstes Speichern fragt wieder', async () => {
    const s = testServer();
    const a = await angemeldet(s, 'a');
    a.store.setze('projekt.name', 'Eins');
    a.v.speichern();
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    const b = await angemeldet(s, 'b');
    await b.v.laden(id);
    b.store.setze('projekt.name', 'Zwei');
    b.v.speichern();
    await b.v.cloudFertig();
    a.store.setze('projekt.name', 'Drei');
    a.v.speichern();
    await a.v.cloudFertig();
    await a.v.konfliktLoesen('spaeter');
    expect(a.v.konflikt.value).toBeNull();
    expect(zeile(a, id)?.cloud).toBe('serverNeuer');
    expect(serverListe(s)[0]!.name).toBe('Zwei');
    a.v.speichern();
    await a.v.cloudFertig();
    expect(a.v.konflikt.value?.id).toBe(id);
  });

  it('Drift: in der Cloud gelöscht → lokal nur markiert, nicht gelöscht, nicht automatisch neu hochgeladen; ausdrückliches Speichern legt es wieder an', async () => {
    const s = testServer();
    const a = await angemeldet(s, 'a');
    a.store.setze('projekt.name', 'Drift');
    a.v.speichern();
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    const b = await angemeldet(s, 'b');
    expect(await b.v.ueberallLoeschen(id)).toEqual({ ok: true });
    expect(serverListe(s)).toEqual([]);

    await a.v.cloudAbgleichen();
    expect(projektListe(a.sp).find((e) => e.id === id)).toMatchObject({ nichtMehrInCloud: true });
    expect(zeile(a, id)?.cloud).toBe('nichtMehrInCloud');
    expect(serverListe(s)).toEqual([]);

    a.v.speichern();
    await a.v.cloudFertig();
    expect(serverListe(s)).toEqual([{ id, name: 'Drift' }]);
    expect(zeile(a, id)?.cloud).toBe('synchron');
    expect(projektListe(a.sp).find((e) => e.id === id)?.nichtMehrInCloud).toBeUndefined();
  });

  it('Löschen mit veraltetem Stand → abgelehnt mit Klartext; Cloud bleibt', async () => {
    const s = testServer();
    const a = await angemeldet(s, 'a');
    a.store.setze('projekt.name', 'Alt');
    a.v.speichern();
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    const b = await angemeldet(s, 'b');
    await b.v.laden(id);
    b.store.setze('projekt.name', 'Neu');
    b.v.speichern();
    await b.v.cloudFertig();
    // A kennt die Änderung von B noch nicht (kein Abgleich) und versucht zu löschen.
    const r = await a.v.ueberallLoeschen(id);
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.text).toContain('anderen Gerät');
    expect(serverListe(s)).toEqual([{ id, name: 'Neu' }]);
    expect(projektListe(a.sp).some((e) => e.id === id)).toBe(true);
  });

  it('Anmelden lädt lokal gespeicherte Projekte hoch; Abmelden behält alles lokal', async () => {
    const s = testServer();
    const a = await gestartet(s, 'a');
    expect(a.v.cloudStatus.value).toBe('abgemeldet');
    a.store.setze('projekt.name', 'Vorher lokal');
    a.v.speichern();
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    expect(serverListe(s)).toEqual([]);
    expect(zeile(a, id)?.cloud).toBeNull();

    await a.v.anmelden(TEST_PASSWORT);
    await a.v.cloudFertig();
    expect(serverListe(s)).toEqual([{ id, name: 'Vorher lokal' }]);
    expect(zeile(a, id)?.cloud).toBe('synchron');

    await a.v.abmelden();
    expect(a.v.cloudStatus.value).toBe('abgemeldet');
    expect(projektListe(a.sp)).toHaveLength(1);
    expect((await a.browser.fetch('/api/heizlast-projekte')).status).toBe(401);
  });
});

describe('Offline und abgelaufene Anmeldung', () => {
  it('offline: lokal gespeichert, Status «offline», später abgeglichen', async () => {
    const s = testServer();
    let online = true;
    const a = await angemeldet(s, 'a', { online: () => online });
    online = false;
    a.v.cloudOffline();
    a.store.setze('projekt.name', 'Unterwegs');
    expect(a.v.speichern()).toEqual({ ok: true });
    await a.v.cloudFertig();
    const id = a.store.state.value.meta.id;
    expect(a.v.cloudStatus.value).toBe('offline');
    expect(a.v.cloudAnzeige.value).toBe('offline');
    expect(serverListe(s)).toEqual([]);

    online = true;
    await a.v.cloudAbgleichen();
    expect(a.v.cloudStatus.value).toBe('angemeldet');
    expect(serverListe(s)).toEqual([{ id, name: 'Unterwegs' }]);
    expect(zeile(a, id)?.cloud).toBe('synchron');
  });

  it('Sitzung serverseitig widerrufen → beim nächsten Speichern «abgemeldet» mit Hinweis, lokal gesichert', async () => {
    const s = testServer();
    const a = await angemeldet(s, 'a');
    s.db.roh.exec(`UPDATE heizlast_sitzung SET revoked_at = '2026-10-30T00:00:00.000Z'`);
    a.store.setze('projekt.name', 'Nach Ablauf');
    expect(a.v.speichern()).toEqual({ ok: true });
    await a.v.cloudFertig();
    expect(a.v.cloudStatus.value).toBe('abgemeldet');
    expect(a.v.cloudText.value).toContain('Anmeldung abgelaufen');
    expect(projektListe(a.sp)).toHaveLength(1);
  });
});

describe('Reine Hilfen', () => {
  const eintrag = (id: string, extra: Partial<ProjektEintrag> = {}): ProjektEintrag => ({
    id,
    name: id,
    methode: null,
    geaendert: '2026-10-30T10:00:00.000Z',
    gespeichert: '2026-10-30T10:00:00.000Z',
    qhW: null,
    qhlW: null,
    state: { meta: { id, schemaVersion: 4, geaendert: '' }, x: id },
    ...extra,
  });
  const cloud = (id: string, version = '2026-10-30T10:00:00.000Z'): CloudEintrag => ({ id, name: id, methode: null, schemaVersion: 4, qhW: null, qhlW: null, erstellt: version, version });

  it('projektZeilen: jedes Projekt einmal; Zustände nach Version und Hash', () => {
    const syn = eintrag('syn', { cloudVersion: 'v1' });
    syn.cloudHash = stateHash(syn.state as never);
    const lokalNeuer = eintrag('ln', { cloudVersion: '2026-10-30T10:00:00.000Z', cloudHash: 'anders' });
    const serverNeuer = eintrag('sn', { cloudVersion: '2026-10-30T09:00:00.000Z' });
    serverNeuer.cloudHash = stateHash(serverNeuer.state as never);
    const z = projektZeilen([syn, lokalNeuer, serverNeuer, eintrag('nl'), eintrag('weg', { cloudVersion: 'v', nichtMehrInCloud: true })], [cloud('syn', 'v1'), cloud('ln'), cloud('sn', '2026-10-30T11:00:00.000Z'), cloud('nc')]);
    const nachId = Object.fromEntries(z.map((x) => [x.id, x.cloud]));
    expect(nachId).toEqual({ syn: 'synchron', ln: 'lokalNeuer', sn: 'serverNeuer', nl: 'nurLokal', weg: 'nichtMehrInCloud', nc: 'nurCloud' });
    expect(z).toHaveLength(6);
    // Ohne Cloud-Liste (nie angemeldet): keine «nur lokal»-Marke, keine Cloud-Zeilen
    expect(projektZeilen([eintrag('nl')], null)[0]!.cloud).toBeNull();
  });

  it('driftMarkieren: markiert fehlende, hebt Markierung wieder auf, löscht nie', () => {
    const l = [eintrag('a', { cloudVersion: 'v' }), eintrag('b', { cloudVersion: 'v', nichtMehrInCloud: true }), eintrag('c')];
    const d = driftMarkieren(l, [cloud('b')]);
    expect(d.geaendert).toBe(true);
    expect(d.liste).toHaveLength(3);
    expect(d.liste.map((e) => !!e.nichtMehrInCloud)).toEqual([true, false, false]);
    // Leere Cloud-Liste (z. B. falsche Bindung) löscht nichts (BUILD-09)
    expect(driftMarkieren(l, []).liste).toHaveLength(3);
  });
});
