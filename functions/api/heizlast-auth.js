// Cloudflare Pages Function: Heizlast-Passwort-Check
// Setzt bei korrektem Passwort einen HttpOnly-Cookie für 30 Tage.
// Passwort wird als Cloudflare-Umgebungsvariable HEIZLAST_PASSWORD gesetzt.

function makeToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  try {
    const { password } = await context.request.json();
    const expected = context.env.HEIZLAST_PASSWORD;

    if (!expected) {
      return new Response(JSON.stringify({ success: false, error: 'Server-Konfiguration fehlt (HEIZLAST_PASSWORD)' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!password || password !== expected) {
      return new Response(JSON.stringify({ success: false, error: 'Falsches Passwort' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Token erzeugen und als HttpOnly-Cookie setzen
    const token = makeToken();
    const maxAge = 60 * 60 * 24 * 30; // 30 Tage

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `tw_heizlast_auth=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET prüft nur Cookie-Vorhandensein (reicht für diesen simplen Gate)
export async function onRequestGet(context) {
  const cookie = context.request.headers.get('Cookie') || '';
  const authed = cookie.includes('tw_heizlast_auth=');
  return new Response(JSON.stringify({ authed }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Logout
export async function onRequestDelete() {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `tw_heizlast_auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}
