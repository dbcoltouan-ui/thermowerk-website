// Cloudflare Pages Function: Kontaktformular
// 1) Persistiert die Anfrage in D1 (Binding env.DB, Tabelle contact_submission)
// 2) Schickt eine Benachrichtigung via Resend an daniel@thermowerk.ch
//    (Absender noreply@thermowerk.ch, reply-to = Kunden-Mail)
// 3) Rueckruf (seit 2026-11-10): Kontaktart nachricht | rueckruf | beides,
//    Wunschzeiten als Raster Mo-Fr, stundenweise 07-19 (Schluessel "di-13" = Dienstag 13-14 Uhr).
//    Bei Rueckruf zusaetzlich: Bestaetigungsmail an den Kunden mit den Wunschzeiten
//    und eine Karte in der Thermowerk-App (POST /api/tasks, Secret APP_API_KEY).
//
// Ersetzt die alte Sanity+Web3Forms-Hybrid-Loesung (Phase 2 Migration, 2026-04-21).

const NOTIFY_TO      = 'daniel@thermowerk.ch';
const NOTIFY_FROM    = 'Thermowerk Website <noreply@thermowerk.ch>';
const CUSTOMER_FROM  = 'Thermowerk <noreply@thermowerk.ch>';
const CUSTOMER_REPLY = 'info@thermowerk.ch';
const APP_TASKS_URL  = 'https://thermowerk.db-coltouan.workers.dev/api/tasks';
const PHONE_PUBLIC   = '+41 76 504 03 68';

const INTEREST_LABEL = {
  waermepumpe:     'Wärmepumpe (Heizungsersatz)',
  klimaanlage:     'Klimaanlage',
  foerderberatung: 'Förderberatung',
  sonstiges:       'Sonstiges',
};
const KONTAKTART_LABEL = {
  nachricht: 'Nachricht (schriftlich)',
  rueckruf:  'Rückruf',
  beides:    'Nachricht + Rückruf',
};

// Raster: Tage Mo-Fr, Startstunden 7..18 (letztes Fenster 18-19)
const DAYS = [
  { key: 'mo', label: 'Mo', name: 'Montag',     dow: 1 },
  { key: 'di', label: 'Di', name: 'Dienstag',   dow: 2 },
  { key: 'mi', label: 'Mi', name: 'Mittwoch',   dow: 3 },
  { key: 'do', label: 'Do', name: 'Donnerstag', dow: 4 },
  { key: 'fr', label: 'Fr', name: 'Freitag',    dow: 5 },
];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const pad2 = (n) => String(n).padStart(2, '0');

// Nur gueltige Schluessel, sortiert nach Tag und Stunde, ohne Doppel
function normalizeSlots(raw) {
  if (!Array.isArray(raw)) return [];
  const valid = new Set();
  for (const s of raw.slice(0, 200)) {
    const m = /^(mo|di|mi|do|fr)-(\d{1,2})$/.exec(String(s).trim().toLowerCase());
    if (!m) continue;
    const h = +m[2];
    if (!HOURS.includes(h)) continue;
    valid.add(`${m[1]}-${h}`);
  }
  const order = (k) => { const [d, h] = k.split('-'); return DAYS.findIndex((x) => x.key === d) * 100 + +h; };
  return [...valid].sort((a, b) => order(a) - order(b));
}

// [{day, label, name, ranges:[[von,bis],...]}] mit zusammengefassten Stunden
function groupSlots(slots) {
  const out = [];
  for (const d of DAYS) {
    const hrs = slots.filter((s) => s.startsWith(d.key + '-')).map((s) => +s.split('-')[1]).sort((a, b) => a - b);
    if (!hrs.length) continue;
    const ranges = [];
    let start = hrs[0], prev = hrs[0];
    for (const h of hrs.slice(1)) {
      if (h === prev + 1) { prev = h; continue; }
      ranges.push([start, prev + 1]); start = prev = h;
    }
    ranges.push([start, prev + 1]);
    out.push({ day: d.key, label: d.label, name: d.name, ranges });
  }
  return out;
}

const fmtRange = ([a, b]) => `${pad2(a)}–${pad2(b)}`;

// "Di 13–15 · Fr 08–09"
function slotsSummary(slots) {
  return groupSlots(slots).map((g) => `${g.label} ${g.ranges.map(fmtRange).join(', ')}`).join(' · ');
}

// Datum/Uhrzeit in Zuerich
function zurichParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { y: +get('year'), m: +get('month'), d: +get('day'), hour: +get('hour'), minute: +get('minute') };
}
function zurichStamp(date) {
  const p = zurichParts(date);
  return `${pad2(p.d)}.${pad2(p.m)}.${p.y} ${pad2(p.hour)}:${pad2(p.minute)}`;
}

// Faelligkeit fuer die App-Karte: Datum des naechsten gewaehlten Zeitfensters (Zuerich), das noch nicht vorbei ist
function nextSlotDate(slots, now = new Date()) {
  const p = zurichParts(now);
  const byDow = {};
  for (const s of slots) { const [d, h] = s.split('-'); const dow = DAYS.find((x) => x.key === d).dow; (byDow[dow] = byDow[dow] || []).push(+h); }
  for (let i = 0; i < 8; i++) {
    const dt = new Date(Date.UTC(p.y, p.m - 1, p.d + i));
    const hrs = byDow[dt.getUTCDay()];
    if (!hrs) continue;
    if (i === 0 && !hrs.some((h) => h + 1 > p.hour)) continue; // heute schon alle Fenster vorbei
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  }
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmail({ name, email, phone, interest, message, submittedAt, kontaktart, slots }) {
  const label = INTEREST_LABEL[interest] || interest || 'Allgemein';
  const rueckruf = kontaktart !== 'nachricht';
  const zeiten = slotsSummary(slots);
  const subject = rueckruf
    ? `Rückruf-Wunsch: ${name || 'ohne Name'} (${phone}) – ${zeiten}`
    : `Neue Anfrage: ${label} - ${name || 'ohne Name'}`;
  const lines = [
    `Kontaktart: ${KONTAKTART_LABEL[kontaktart]}`,
    ...(rueckruf ? [`Wunschzeiten: ${zeiten}`] : []),
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
  const row = (k, v) => `<tr><td style="padding:4px 12px 4px 0;color:#667;vertical-align:top"><strong>${k}</strong></td><td>${v}</td></tr>`;
  const zeitenHtml = groupSlots(slots).map((g) => `<strong>${g.label}</strong> ${g.ranges.map(fmtRange).join(', ')}`).join('<br>');
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#111d33;line-height:1.55">
      <h2 style="margin:0 0 12px;color:#c4161c">${rueckruf ? 'Rückruf-Wunsch' : 'Neue Kontaktanfrage'}</h2>
      ${rueckruf ? `<div style="margin:0 0 16px;padding:12px 14px;background:#e8edf5;border-left:3px solid #1b2a4a">
        <div style="font-size:13px;color:#667;margin-bottom:4px">Wunschzeiten (Mo–Fr)</div>
        <div style="font-size:16px">${zeitenHtml}</div>
        <div style="margin-top:8px">Telefon: <a href="tel:${escapeHtml(phone.replace(/[^0-9+]/g, ''))}">${escapeHtml(phone)}</a></div>
      </div>` : ''}
      <table style="border-collapse:collapse;font-size:15px">
        ${row('Kontaktart', escapeHtml(KONTAKTART_LABEL[kontaktart]))}
        ${row('Name', escapeHtml(name))}
        ${row('E-Mail', `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`)}
        ${row('Telefon', escapeHtml(phone) || '-')}
        ${row('Interesse', escapeHtml(label))}
        ${row('Eingang', escapeHtml(submittedAt))}
      </table>
      <h3 style="margin:20px 0 6px;color:#111d33">Nachricht</h3>
      <div style="padding:12px 14px;background:#f5f6f9;border-left:3px solid #c4161c;white-space:pre-wrap">${escapeHtml(message) || '<em>(keine Nachricht)</em>'}</div>
      <p style="margin-top:22px;font-size:13px;color:#667">
        Auf diese Mail antworten geht direkt an ${escapeHtml(email)}.<br>
        Gespeichert in D1 (contact_submission).${rueckruf ? ' Karte in der Thermowerk-App angelegt.' : ''}
      </p>
    </div>`;
  return { subject, text, html };
}

// Bestaetigung an den Kunden (nur bei Rueckruf): nur das Noetige - Telefonnummer und Wunschzeiten
function buildCustomerEmail({ name, phone, slots }) {
  const groups = groupSlots(slots);
  const subject = 'Ihr Rückruf-Wunsch bei Thermowerk';
  const text = [
    `Guten Tag ${name}`,
    '',
    `Vielen Dank für Ihre Anfrage. Wir rufen Sie unter ${phone} zurück, nach Möglichkeit in einem Ihrer Wunschzeitfenster:`,
    '',
    ...groups.map((g) => `${g.name}: ${g.ranges.map(fmtRange).join(', ')} Uhr`),
    '',
    `Falls sich etwas ändert, antworten Sie einfach auf diese E-Mail oder rufen Sie uns an: ${PHONE_PUBLIC}.`,
    '',
    'Freundliche Grüsse',
    'Daniel Coltouan',
    'Thermowerk · Gebäudetechnik Coltouan',
    'Rankstrasse 18, 8413 Neftenbach',
    'info@thermowerk.ch · www.thermowerk.ch',
  ].join('\n');
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1b2a4a;line-height:1.55;font-size:15px">
      <p>Guten Tag ${escapeHtml(name)}</p>
      <p>Vielen Dank für Ihre Anfrage. Wir rufen Sie unter <strong>${escapeHtml(phone)}</strong> zurück, nach Möglichkeit in einem Ihrer Wunschzeitfenster:</p>
      <table style="border-collapse:collapse;margin:4px 0 16px">
        ${groups.map((g) => `<tr><td style="padding:3px 16px 3px 0"><strong>${g.name}</strong></td><td style="padding:3px 0">${g.ranges.map(fmtRange).join(', ')} Uhr</td></tr>`).join('')}
      </table>
      <p>Falls sich etwas ändert, antworten Sie einfach auf diese E-Mail oder rufen Sie uns an: <a href="tel:+41765040368" style="color:#1b2a4a">${PHONE_PUBLIC}</a>.</p>
      <p>Freundliche Grüsse<br><strong>Daniel Coltouan</strong><br>Thermowerk · Gebäudetechnik Coltouan<br>Rankstrasse 18, 8413 Neftenbach<br>
      <a href="mailto:info@thermowerk.ch" style="color:#1b2a4a">info@thermowerk.ch</a> · <a href="https://www.thermowerk.ch" style="color:#1b2a4a">www.thermowerk.ch</a></p>
    </div>`;
  return { subject, text, html };
}

async function sendViaResend(apiKey, { from, to, replyTo, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo || undefined, subject, text, html }),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* noop */ }
  return res.ok ? { ok: true, id: data?.id || null } : { ok: false, error: data?.message || ('HTTP ' + res.status) };
}

// Karte in der Thermowerk-App (Heute-Seite, Bereich Kunden)
async function createAppTask(apiKey, { id, name, email, phone, interest, message, submittedAt, slots }) {
  const label = INTEREST_LABEL[interest] || interest || 'Allgemein';
  const detail = [
    `Website-Anfrage Nr. ${id ?? '-'} vom ${submittedAt}`,
    `Wunschzeiten: ${slotsSummary(slots)}`,
    `Telefon: ${phone}`,
    `E-Mail: ${email}`,
    `Interesse: ${label}`,
    `Nachricht: ${message || '(keine)'}`,
  ].join('\n');
  const res = await fetch(APP_TASKS_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Rückruf: ${name}, ${phone}`,
      bereich: 'kunden',
      due_date: nextSlotDate(slots),
      effort_min: 15,
      detail,
    }),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* noop */ }
  return res.ok ? { ok: true, uid: data?.uid || data?.id || null } : { ok: false, error: data?.error || ('HTTP ' + res.status) };
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
});

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Honeypot: unsichtbares Feld "botcheck" darf nie ausgefuellt sein
    if (body.botcheck) return json({ success: false, error: 'Spam erkannt' }, 403);

    const name       = String(body.name     || '').trim().slice(0, 200);
    const email      = String(body.email    || '').trim().slice(0, 200);
    const phone      = String(body.phone    || '').trim().slice(0, 60);
    const interest   = String(body.interest || '').trim().slice(0, 60);
    const message    = String(body.message  || '').trim().slice(0, 5000);
    const kontaktart = ['nachricht', 'rueckruf', 'beides'].includes(body.kontaktart) ? body.kontaktart : 'nachricht';
    const rueckruf   = kontaktart !== 'nachricht';
    const slots      = rueckruf ? normalizeSlots(body.rueckruf_slots) : [];

    if (!name || !email) return json({ success: false, error: 'Pflichtfelder fehlen' }, 400);
    if (kontaktart !== 'rueckruf' && !message) return json({ success: false, error: 'Nachricht fehlt' }, 400);
    if (rueckruf && (phone.replace(/\D/g, '').length < 6)) return json({ success: false, error: 'Telefonnummer fehlt' }, 400);
    if (rueckruf && !slots.length) return json({ success: false, error: 'Wunschzeit fehlt' }, 400);

    const now = new Date();
    const submittedAt = now.toISOString();
    const zeitenText = rueckruf ? slotsSummary(slots) : null;

    // 1) In D1 speichern
    const db = context.env.DB;
    if (!db) return json({ success: false, error: 'D1-Binding fehlt (env.DB)' }, 500);

    let insertedId = null;
    try {
      const result = await db.prepare(
        `INSERT INTO contact_submission (name, email, phone, interest, message, submitted_at, status, kontaktart, rueckruf_slots, rueckruf_text)
         VALUES (?, ?, ?, ?, ?, ?, 'neu', ?, ?, ?)`
      ).bind(name, email, phone || null, interest || null, message, submittedAt, kontaktart,
             rueckruf ? JSON.stringify(slots) : null, zeitenText).run();
      insertedId = result?.meta?.last_row_id ?? null;
    } catch (err) {
      return json({ success: false, error: 'DB-Fehler: ' + err.message }, 500);
    }

    // 2) Mails via Resend und App-Karte. Fehler hier duerfen den Submit nicht killen -
    //    die Anfrage ist in D1, das ist der Wahrheitsanker. Status geht in die Response.
    const apiKey = context.env.RESEND_API_KEY;
    const stamp = zurichStamp(now);
    const data = { id: insertedId, name, email, phone, interest, message, submittedAt: stamp, kontaktart, slots };

    let mail = { ok: false, skipped: true };
    let kundenMail = { ok: false, skipped: true };
    let app = { ok: false, skipped: true };

    if (apiKey) {
      try {
        const m = buildEmail(data);
        mail = await sendViaResend(apiKey, { from: NOTIFY_FROM, to: NOTIFY_TO, replyTo: email, ...m });
      } catch (err) { mail = { ok: false, error: err.message }; }
      if (rueckruf) {
        try {
          const c = buildCustomerEmail(data);
          kundenMail = await sendViaResend(apiKey, { from: CUSTOMER_FROM, to: email, replyTo: CUSTOMER_REPLY, ...c });
        } catch (err) { kundenMail = { ok: false, error: err.message }; }
      }
    }
    if (rueckruf && context.env.APP_API_KEY) {
      try { app = await createAppTask(context.env.APP_API_KEY, data); }
      catch (err) { app = { ok: false, error: err.message }; }
    }

    return json({ success: true, id: insertedId, mail, kunden_mail: kundenMail, app });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
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
