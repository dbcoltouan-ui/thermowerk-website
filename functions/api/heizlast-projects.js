// Cloudflare Pages Function: Heizlast-Projekte (Liste / Laden / Speichern / Loeschen)
// Backend ist jetzt Cloudflare D1 (Binding env.DB, Tabelle heizlast_project).
// Alle Endpoints erfordern den Auth-Cookie (gesetzt via /api/heizlast-auth).
//
// Das Response-Shape bleibt bewusst kompatibel zum alten Sanity-Client
// (src/lib/heizlast/projects.ts): _id-Feld auf Projekten, projects:[] in der Liste,
// project:{...} beim Einzel-GET, id beim POST, success:true beim DELETE.

function checkAuth(context) {
  const cookie = context.request.headers.get('Cookie') || '';
  return cookie.includes('tw_heizlast_auth=');
}

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: 'Nicht autorisiert' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(status, error) {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonOk(payload) {
  return new Response(JSON.stringify({ success: true, ...payload }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// D1-Row → Client-Projekt (Sanity-kompatibel: _id statt id, camelCase, stateJson als String)
function rowToProject(row, { withState } = { withState: false }) {
  if (!row) return null;
  const out = {
    _id:          row.id,
    projectName:  row.project_name,
    customerName: row.customer_name || '',
    address:      row.address || '',
    qhl:          typeof row.qhl === 'number' ? row.qhl : null,
    qh:           typeof row.qh  === 'number' ? row.qh  : null,
    ebf:          typeof row.ebf === 'number' ? row.ebf : null,
    status:       row.status || 'arbeit',
    notes:        row.notes || '',
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
  if (withState) out.stateJson = row.state_json || '{}';
  return out;
}

// GET /api/heizlast-projects              → Liste (ohne state_json)
// GET /api/heizlast-projects?id=<uuid>    → Einzelprojekt inkl. state_json
export async function onRequestGet(context) {
  if (!checkAuth(context)) return unauthorized();
  const db = context.env.DB;
  if (!db) return jsonError(500, 'D1-Binding fehlt (env.DB)');

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  try {
    if (id) {
      const row = await db.prepare(
        `SELECT id, project_name, customer_name, address, qhl, qh, ebf, state_json,
                status, notes, created_at, updated_at
         FROM heizlast_project WHERE id = ? LIMIT 1`
      ).bind(id).first();
      return jsonOk({ project: rowToProject(row, { withState: true }) });
    }

    const { results } = await db.prepare(
      `SELECT id, project_name, customer_name, address, qhl, qh, ebf,
              status, notes, created_at, updated_at
       FROM heizlast_project ORDER BY updated_at DESC`
    ).all();
    const projects = (results || []).map((r) => rowToProject(r, { withState: false }));
    return jsonOk({ projects });
  } catch (err) {
    return jsonError(500, 'DB-Fehler: ' + err.message);
  }
}

// POST /api/heizlast-projects  → create-or-replace
// Body: { id?, projectName, customerName, address, qhl, qh, ebf, stateJson, status, notes, createdAt? }
export async function onRequestPost(context) {
  if (!checkAuth(context)) return unauthorized();
  const db = context.env.DB;
  if (!db) return jsonError(500, 'D1-Binding fehlt (env.DB)');

  try {
    const body = await context.request.json();
    const now = new Date().toISOString();

    const id           = body.id || crypto.randomUUID();
    const projectName  = String(body.projectName  || 'Unbenannt');
    const customerName = String(body.customerName || '');
    const address      = String(body.address      || '');
    const qhl          = typeof body.qhl === 'number' ? body.qhl : null;
    const qh           = typeof body.qh  === 'number' ? body.qh  : null;
    const ebf          = typeof body.ebf === 'number' ? body.ebf : null;
    const stateJson    = typeof body.stateJson === 'string' ? body.stateJson : '{}';
    const status       = String(body.status || 'arbeit');
    const notes        = String(body.notes  || '');
    const createdAt    = body.createdAt || now;

    // UPSERT: INSERT, bei Konflikt auf PK → UPDATE (ohne created_at anzufassen)
    await db.prepare(
      `INSERT INTO heizlast_project
         (id, project_name, customer_name, address, qhl, qh, ebf, state_json, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         project_name  = excluded.project_name,
         customer_name = excluded.customer_name,
         address       = excluded.address,
         qhl           = excluded.qhl,
         qh            = excluded.qh,
         ebf           = excluded.ebf,
         state_json    = excluded.state_json,
         status        = excluded.status,
         notes         = excluded.notes,
         updated_at    = excluded.updated_at`
    ).bind(
      id, projectName, customerName, address, qhl, qh, ebf, stateJson, status, notes, createdAt, now
    ).run();

    return jsonOk({ id });
  } catch (err) {
    return jsonError(500, 'DB-Fehler: ' + err.message);
  }
}

// DELETE /api/heizlast-projects?id=<uuid>
export async function onRequestDelete(context) {
  if (!checkAuth(context)) return unauthorized();
  const db = context.env.DB;
  if (!db) return jsonError(500, 'D1-Binding fehlt (env.DB)');

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonError(400, 'Keine ID');

  try {
    await db.prepare(`DELETE FROM heizlast_project WHERE id = ?`).bind(id).run();
    return jsonOk({});
  } catch (err) {
    return jsonError(500, 'DB-Fehler: ' + err.message);
  }
}
