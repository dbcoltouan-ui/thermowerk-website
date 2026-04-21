// Cloudflare Pages Function: Kontaktformular
// 1) Persistiert die Anfrage in D1 (Binding env.DB, Tabelle contact_submission)
// 2) Schickt eine Benachrichtigung via Resend an daniel@thermowerk.ch
//    (Absender noreply@thermowerk.ch, reply-to = Kunden-Mail)
//
// Ersetzt die alte Sanity+Web3Forms-Hybrid-Loesung (Phase 2 Migration, 2026-04-21).

const NOTIFY_TO      = 'daniel@thermowerk.ch';
const NOTIFY_FROM    = 'Thermowerk Website <noreply@thermowerk.ch>';
const INTEREST_LABEL = {
  waermepumpe:     'Waermepumpe (Heizungsersatz)',
  klimaanlage:     'Klimaanlage',
  foerderberatung: 'Foerderberatung',
  sonstiges:       'Sonstiges',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmail({ name, email, phone, interest, message, submittedAt }) {
  const label = INTEREST_LABEL[interest] || interest || 'Allgemein';
  const subject = `Neue Anfrage: ${label} - ${name || 'ohne Name'}`;
  const lines = [
    `Name:      ${name || '-'}`,
    `E-Mail:    ${email || '-'}`,
    `Telefon:   ${phone || '-'}`,
    `Interesse: ${label}`,
    `Eingang:   ${submittedAt}`,
    '',
    'Nachricht:',
    message || '(keine Nachricht)',
  ];
  const text = lines.join('\n');
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#111d33;line-height:1.55">
      <h2 style="margin:0 0 12px;color:#c4161c">Neue Kontaktanfrage</h2>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:4px 12px 4px 0;color:#667"><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#667"><strong>E-Mail</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#667"><strong>Telefon</strong></td><td>${escapeHtml(phone) || '-'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#667"><strong>Interesse</strong></td><td>${escapeHtml(label)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#667"><strong>Eingang</strong></td><td>${escapeHtml(submittedAt)}</td></tr>
      </table>
      <h3 style="margin:20px 0 6px;color:#111d33">Nachricht</h3>
      <div style="padding:12px 14px;background:#f5f6f9;border-left:3px solid #c4161c;white-space:pre-wrap">${escapeHtml(message) || '<em>(keine Nachricht)</em>'}</div>
      <p style="margin-top:22px;font-size:13px;color:#667">
        Auf diese Mail antworten geht direkt an ${escapeHtml(email)}.<br>
        Gespeichert in D1 (contact_submission). Verwaltung folgt.
      </p>
    </div>`;
  return { subject, text, html };
}

async function sendMailViaResend(apiKey, payload, customerEmail) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      reply_to: customerEmail || undefined,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* noop */ }
  return { ok: res.ok, status: res.status, data };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Honeypot: unsichtbares Feld "botcheck" darf nie ausgefuellt sein
    if (body.botcheck) {
      return new Response(JSON.stringify({ success: false, error: 'Spam erkannt' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const name     = String(body.name     || '').trim();
    const email    = String(body.email    || '').trim();
    const phone    = String(body.phone    || '').trim();
    const interest = String(body.interest || '').trim();
    const message  = String(body.message  || '').trim();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Pflichtfelder fehlen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submittedAt = new Date().toISOString();

    // 1) In D1 speichern
    const db = context.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'D1-Binding fehlt (env.DB)' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let insertedId = null;
    try {
      const result = await db.prepare(
        `INSERT INTO contact_submission (name, email, phone, interest, message, submitted_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'neu')`
      ).bind(name, email, phone || null, interest || null, message, submittedAt).run();
      insertedId = result?.meta?.last_row_id ?? null;
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: 'DB-Fehler: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2) Mail via Resend (Fehler hier darf den Submit nicht ganz killen -
    //    die Anfrage ist in D1, das ist der Wahrheitsanker. Mail-Status geht in die Response.)
    const apiKey = context.env.RESEND_API_KEY;
    let mail = { ok: false, skipped: true };
    if (apiKey) {
      try {
        const payload = buildEmail({ name, email, phone, interest, message, submittedAt });
        const sent = await sendMailViaResend(apiKey, payload, email);
        mail = sent.ok
          ? { ok: true, id: sent.data?.id || null }
          : { ok: false, error: sent.data?.message || ('HTTP ' + sent.status) };
      } catch (err) {
        mail = { ok: false, error: err.message };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      id: insertedId,
      mail,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// CORS Preflight (behalten, auch wenn wir same-origin sind - schadet nicht)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
