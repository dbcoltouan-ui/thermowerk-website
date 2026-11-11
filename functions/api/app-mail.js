// Cloudflare Pages Function: Mail-Versand fuer die Thermowerk-App (11.11.2026)
// Die App (Worker thermowerk) hat keinen eigenen Resend-Schluessel. Sie ruft diesen Endpunkt auf,
// z. B. nach der Online-Unterzeichnung einer Auftragsbestaetigung (Bestaetigung an den Kunden).
// Schutz: Header x-api-key == env.APP_API_KEY. Absender, Antwortadresse und Kopie an Daniel sind fest.
// Body: { to, subject, text, html?, attachments?: [{ filename, content(base64) }] }
// Antwort: { ok, id } bzw. { ok:false, error }

const FROM     = 'Thermowerk <noreply@thermowerk.ch>';
const REPLY_TO = 'info@thermowerk.ch';
const COPY_TO  = 'daniel@thermowerk.ch';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const key = request.headers.get('x-api-key') || '';
  if (!env.APP_API_KEY || key !== env.APP_API_KEY) return json({ ok: false, error: 'Nicht berechtigt' }, 401);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY fehlt' }, 500);
  let b;
  try { b = await request.json(); } catch (_) { return json({ ok: false, error: 'Ungueltiger Body' }, 400); }
  const to = String(b.to || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ ok: false, error: 'Empfaenger ungueltig' }, 400);
  if (!b.subject || !b.text) return json({ ok: false, error: 'Betreff und Text erforderlich' }, 400);
  const attachments = (Array.isArray(b.attachments) ? b.attachments : [])
    .filter(a => a && a.filename && a.content)
    .slice(0, 3)
    .map(a => ({ filename: String(a.filename).slice(0, 120), content: String(a.content) }));
  const payload = {
    from: FROM, to: [to], bcc: to.toLowerCase() === COPY_TO ? undefined : [COPY_TO], reply_to: REPLY_TO,
    subject: String(b.subject).slice(0, 200), text: String(b.text),
    html: b.html ? String(b.html) : undefined,
    attachments: attachments.length ? attachments : undefined,
  };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* noop */ }
    if (!res.ok) return json({ ok: false, error: data?.message || ('HTTP ' + res.status) }, 502);
    return json({ ok: true, id: data?.id || null });
  } catch (err) {
    return json({ ok: false, error: err.message }, 502);
  }
}
