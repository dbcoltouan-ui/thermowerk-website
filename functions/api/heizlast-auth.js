// Cloudflare Pages Function: Anmeldung Heizlast-Rechner (Session 10, neu; BUILD-06/07)
//
//   POST   { password }  → 200 { success: true, ablauf } + signiertes Cookie (30 Tage)
//                         → 401 falsches Passwort · 429 gesperrt (5 Fehlversuche / 15 min, Retry-After)
//   GET                   → 200 { authed, ablauf? } — prüft Signatur, Ablauf und Sitzung in D1
//   DELETE                → 200 { success: true } — widerruft die Sitzung in D1 und löscht das Cookie
//
// Antwortform (success/error/authed) bleibt wie bisher, damit das alte Tool unter /heizlast/ bis zum
// Go-Live (Session 12) weiter anmelden kann; es nutzt ab jetzt dieselbe sichere Anmeldung.
// Umgebung: HEIZLAST_PASSWORD, HEIZLAST_COOKIE_SECRET (≥ 32 Zeichen), Binding DB — siehe _lib/heizlast-sitzung.js.

import {
  absenderSchluessel,
  anmeldungPruefen,
  cookieLesen,
  cookieLoeschen,
  cookieSetzen,
  fehlversuchMerken,
  fehlversucheLoeschen,
  jetztSekunden,
  json,
  konfigFehler,
  LAUFZEIT_S,
  neueTokenId,
  passwortGleich,
  serverfehler,
  sitzungAnlegen,
  sitzungWiderrufen,
  sperreStatus,
  tokenErzeugen,
  tokenPruefen,
} from '../_lib/heizlast-sitzung.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  const konfig = konfigFehler(env, { passwort: true });
  if (konfig) return konfig;

  let passwort;
  try {
    const body = await request.json();
    passwort = body && typeof body.password === 'string' ? body.password : null;
  } catch {
    passwort = null;
  }
  if (passwort === null || passwort.length > 512) return json(400, { success: false, error: 'Passwort fehlt' });

  const db = env.DB;
  const jetztS = jetztSekunden();
  try {
    const schluessel = await absenderSchluessel(env.HEIZLAST_COOKIE_SECRET, request);
    const sperre = await sperreStatus(db, schluessel, jetztS);
    if (sperre.wartenS > 0) {
      const min = Math.ceil(sperre.wartenS / 60);
      return json(
        429,
        { success: false, error: `Zu viele Fehlversuche — bitte in ${min} ${min === 1 ? 'Minute' : 'Minuten'} erneut versuchen.`, wartenS: sperre.wartenS },
        { 'Retry-After': String(sperre.wartenS) },
      );
    }
    if (!(await passwortGleich(passwort, env.HEIZLAST_PASSWORD))) {
      await fehlversuchMerken(db, schluessel, jetztS);
      return json(401, { success: false, error: 'Falsches Passwort' });
    }
    await fehlversucheLoeschen(db, schluessel);
    const tokenId = neueTokenId();
    const ablaufS = jetztS + LAUFZEIT_S;
    await sitzungAnlegen(db, tokenId, jetztS, ablaufS);
    const token = await tokenErzeugen(env.HEIZLAST_COOKIE_SECRET, tokenId, ablaufS);
    return json(200, { success: true, ablauf: new Date(ablaufS * 1000).toISOString() }, { 'Set-Cookie': cookieSetzen(token, LAUFZEIT_S) });
  } catch (e) {
    return serverfehler(e, 'Anmelden');
  }
}

export async function onRequestGet(context) {
  const r = await anmeldungPruefen(context);
  if (r.ok) return json(200, { authed: true, ablauf: new Date(r.ablaufS * 1000).toISOString() });
  if (r.antwort.status === 401) return json(200, { authed: false });
  return r.antwort;
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const loeschen = { 'Set-Cookie': cookieLoeschen() };
  const konfig = konfigFehler(env);
  if (konfig) return konfig;
  const token = cookieLesen(request);
  if (token) {
    const jetztS = jetztSekunden();
    const t = await tokenPruefen(env.HEIZLAST_COOKIE_SECRET, token, jetztS);
    if (t.ok) {
      try {
        await sitzungWiderrufen(env.DB, t.tokenId, jetztS);
      } catch (e) {
        console.error('[heizlast] Abmelden:', e);
        return json(500, { success: false, error: 'Serverfehler — Sitzung nicht widerrufen' }, loeschen);
      }
    }
  }
  return json(200, { success: true }, loeschen);
}
