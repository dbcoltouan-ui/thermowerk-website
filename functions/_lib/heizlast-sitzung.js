// Anmeldung für den Heizlast-Rechner (Session 10; BUILD-06/07): signierte Cookies mit Ablauf, Sitzungen in
// D1 (Widerruf beim Abmelden), zeitkonstante Vergleiche, Sperre nach Fehlversuchen.
//
// Cookie `tw_heizlast_auth` = `v1.<tokenId>.<ablaufUnixS>.<signatur>`
//   signatur = HMAC-SHA256(HEIZLAST_COOKIE_SECRET, "v1.<tokenId>.<ablaufUnixS>"), base64url
// Gültig ist ein Cookie nur, wenn (1) die Signatur stimmt (crypto.subtle.verify, zeitkonstant), (2) der Ablauf
// nicht überschritten ist und (3) die Sitzung in D1 existiert und nicht widerrufen ist.
//
// Umgebung: HEIZLAST_COOKIE_SECRET (≥ 32 Zeichen, Pflicht), HEIZLAST_PASSWORD (Pflicht), Binding DB (D1).
// Fehlt etwas, antworten die Endpoints mit 500 und nennen die fehlende Einstellung (keine Interna aus D1).

import { stelleSchemaSicher } from './heizlast-schema.js';

export const COOKIE_NAME = 'tw_heizlast_auth';
export const LAUFZEIT_S = 30 * 24 * 60 * 60;
export const SPERRE = { versuche: 5, fensterS: 15 * 60 };
const SECRET_MIN = 32;

const enc = new TextEncoder();

/* --- Antworten ---------------------------------------------------------------------------------- */

export function json(status, daten, kopf = {}) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...kopf },
  });
}

/** Interner Fehler: Details nur ins Log, nach aussen ein neutraler Text (BUILD-08). */
export function serverfehler(e, wo) {
  console.error(`[heizlast] ${wo}:`, e);
  return json(500, { ok: false, success: false, fehler: 'Serverfehler', error: 'Serverfehler' });
}

/* --- Konfiguration ------------------------------------------------------------------------------ */

/** Prüft die Server-Einstellungen; null = alles da, sonst die 500-Antwort mit Klartext. */
export function konfigFehler(env, { passwort = false } = {}) {
  const fehlt = [];
  if (typeof env.HEIZLAST_COOKIE_SECRET !== 'string' || env.HEIZLAST_COOKIE_SECRET.length < SECRET_MIN) fehlt.push('HEIZLAST_COOKIE_SECRET');
  if (passwort && (typeof env.HEIZLAST_PASSWORD !== 'string' || !env.HEIZLAST_PASSWORD)) fehlt.push('HEIZLAST_PASSWORD');
  if (!env.DB) fehlt.push('D1-Binding DB');
  if (!fehlt.length) return null;
  const text = `Server-Konfiguration fehlt (${fehlt.join(', ')})`;
  return json(500, { ok: false, success: false, authed: false, fehler: text, error: text });
}

/* --- Kodierung ---------------------------------------------------------------------------------- */

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ausB64url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const pad = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    const bin = atob(pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const schluesselCache = new Map();
function hmacSchluessel(secret) {
  let k = schluesselCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    schluesselCache.set(secret, k);
  }
  return k;
}

/* --- Vergleiche --------------------------------------------------------------------------------- */

/** Zeitkonstanter Vergleich zweier gleich langer Byte-Folgen. */
function gleichBytes(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/** Passwortvergleich über SHA-256 beider Seiten (gleiche Länge, zeitkonstant; BUILD-07). */
export async function passwortGleich(eingabe, erwartet) {
  if (typeof eingabe !== 'string' || typeof erwartet !== 'string') return false;
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(eingabe)), crypto.subtle.digest('SHA-256', enc.encode(erwartet))]);
  return gleichBytes(new Uint8Array(a), new Uint8Array(b));
}

/* --- Token -------------------------------------------------------------------------------------- */

export function neueTokenId() {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return b64url(b);
}

export async function tokenErzeugen(secret, tokenId, ablaufS) {
  const kopf = `v1.${tokenId}.${ablaufS}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacSchluessel(secret), enc.encode(kopf));
  return `${kopf}.${b64url(sig)}`;
}

/** Prüft Format, Signatur (zeitkonstant) und Ablauf; die Sitzung in D1 prüft `sitzungPruefen`. */
export async function tokenPruefen(secret, token, jetztS) {
  if (typeof token !== 'string' || token.length > 200) return { ok: false, grund: 'format' };
  const teile = token.split('.');
  if (teile.length !== 4 || teile[0] !== 'v1' || !/^[A-Za-z0-9_-]{16,64}$/.test(teile[1]) || !/^\d{1,12}$/.test(teile[2])) return { ok: false, grund: 'format' };
  const sig = ausB64url(teile[3]);
  if (!sig || sig.length !== 32) return { ok: false, grund: 'format' };
  const gueltig = await crypto.subtle.verify('HMAC', await hmacSchluessel(secret), sig, enc.encode(`v1.${teile[1]}.${teile[2]}`));
  if (!gueltig) return { ok: false, grund: 'signatur' };
  const ablaufS = Number(teile[2]);
  if (ablaufS <= jetztS) return { ok: false, grund: 'abgelaufen' };
  return { ok: true, tokenId: teile[1], ablaufS };
}

/* --- Cookie ------------------------------------------------------------------------------------- */

/** Liest genau das Cookie `tw_heizlast_auth` (kein Teilstring-Treffer wie früher, BUILD-06). */
export function cookieLesen(request) {
  const kopf = request.headers.get('Cookie') || '';
  for (const teil of kopf.split(';')) {
    const i = teil.indexOf('=');
    if (i < 0) continue;
    if (teil.slice(0, i).trim() === COOKIE_NAME) return teil.slice(i + 1).trim();
  }
  return null;
}

export function cookieSetzen(token, maxAgeS) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAgeS}; HttpOnly; Secure; SameSite=Lax`;
}

export function cookieLoeschen() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

/* --- Sitzungen in D1 ---------------------------------------------------------------------------- */

const iso = (s) => new Date(s * 1000).toISOString();

export async function sitzungAnlegen(db, tokenId, jetztS, ablaufS) {
  await stelleSchemaSicher(db);
  // Aufräumen: abgelaufene Sitzungen (älter als ihr Ablauf) entfernen.
  await db.batch([
    db.prepare('DELETE FROM heizlast_sitzung WHERE expires_at < ?').bind(iso(jetztS)),
    db.prepare('INSERT INTO heizlast_sitzung (token_id, created_at, expires_at, revoked_at) VALUES (?, ?, ?, NULL)').bind(tokenId, iso(jetztS), iso(ablaufS)),
  ]);
}

export async function sitzungPruefen(db, tokenId, jetztS) {
  await stelleSchemaSicher(db);
  const row = await db.prepare('SELECT expires_at, revoked_at FROM heizlast_sitzung WHERE token_id = ? LIMIT 1').bind(tokenId).first();
  return !!row && row.revoked_at === null && row.expires_at > iso(jetztS);
}

export async function sitzungWiderrufen(db, tokenId, jetztS) {
  await stelleSchemaSicher(db);
  await db.prepare('UPDATE heizlast_sitzung SET revoked_at = ? WHERE token_id = ? AND revoked_at IS NULL').bind(iso(jetztS), tokenId).run();
}

/* --- Sperre nach Fehlversuchen ------------------------------------------------------------------ */

/** Absender-Schlüssel: HMAC der IP (keine Klartext-IP in der Datenbank). */
export async function absenderSchluessel(secret, request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unbekannt';
  const sig = await crypto.subtle.sign('HMAC', await hmacSchluessel(secret), enc.encode(`login:${ip}`));
  return hex(sig).slice(0, 32);
}

/** Anzahl Fehlversuche im Fenster und Wartezeit bis zur Freigabe [s] (0 = frei). */
export async function sperreStatus(db, schluessel, jetztS) {
  await stelleSchemaSicher(db);
  const ab = jetztS - SPERRE.fensterS;
  const row = await db.prepare('SELECT COUNT(*) AS n, MIN(attempted_at) AS erster FROM login_attempts WHERE key_hash = ? AND attempted_at > ?').bind(schluessel, ab).first();
  const n = Number(row?.n ?? 0);
  if (n < SPERRE.versuche) return { versuche: n, wartenS: 0 };
  // Frei, sobald so viele alte Versuche aus dem Fenster gefallen sind, dass weniger als 5 übrig bleiben.
  const { results } = await db
    .prepare('SELECT attempted_at FROM login_attempts WHERE key_hash = ? AND attempted_at > ? ORDER BY attempted_at DESC LIMIT 1 OFFSET ?')
    .bind(schluessel, ab, SPERRE.versuche - 1)
    .all();
  const massgebend = Number(results?.[0]?.attempted_at ?? row?.erster ?? jetztS);
  return { versuche: n, wartenS: Math.max(1, massgebend + SPERRE.fensterS - jetztS) };
}

export async function fehlversuchMerken(db, schluessel, jetztS) {
  await db.batch([
    db.prepare('DELETE FROM login_attempts WHERE attempted_at <= ?').bind(jetztS - SPERRE.fensterS),
    db.prepare('INSERT INTO login_attempts (key_hash, attempted_at) VALUES (?, ?)').bind(schluessel, jetztS),
  ]);
}

export async function fehlversucheLoeschen(db, schluessel) {
  await db.prepare('DELETE FROM login_attempts WHERE key_hash = ?').bind(schluessel).run();
}

/* --- Prüfung je Anfrage ------------------------------------------------------------------------- */

export const jetztSekunden = () => Math.floor(Date.now() / 1000);

/**
 * Prüft die Anmeldung einer Anfrage. Ergebnis `{ ok: true, tokenId, ablaufS }` oder `{ ok: false, antwort }`
 * (500 bei fehlender Konfiguration, 401 ohne gültige Sitzung, 500 bei Datenbankfehler ohne Details).
 */
export async function anmeldungPruefen(context) {
  const { env, request } = context;
  const konfig = konfigFehler(env);
  if (konfig) return { ok: false, antwort: konfig };
  const nichtAngemeldet = { ok: false, antwort: json(401, { ok: false, success: false, fehler: 'Nicht angemeldet', error: 'Nicht autorisiert' }) };
  const token = cookieLesen(request);
  if (!token) return nichtAngemeldet;
  const jetztS = jetztSekunden();
  const t = await tokenPruefen(env.HEIZLAST_COOKIE_SECRET, token, jetztS);
  if (!t.ok) return nichtAngemeldet;
  try {
    if (!(await sitzungPruefen(env.DB, t.tokenId, jetztS))) return nichtAngemeldet;
  } catch (e) {
    return { ok: false, antwort: serverfehler(e, 'Sitzung prüfen') };
  }
  return { ok: true, tokenId: t.tokenId, ablaufS: t.ablaufS };
}
