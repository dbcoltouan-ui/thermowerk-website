// Cloudflare Pages Function: Heizlast-Projekte (Liste / Speichern / Löschen)
// Alle Endpoints erfordern den Auth-Cookie (gesetzt via /api/heizlast-auth).

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

function getSanityConfig(env) {
  return {
    token: env.SANITY_API_TOKEN,
    projectId: env.SANITY_PROJECT_ID || 'wpbatz1m',
    dataset: env.SANITY_DATASET || 'production',
  };
}

// GET /api/heizlast-projects  → Liste aller Projekte (ohne stateJson für Performance)
export async function onRequestGet(context) {
  if (!checkAuth(context)) return unauthorized();
  const { token, projectId, dataset } = getSanityConfig(context.env);
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Kein Sanity-Token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  // Einzelnes Projekt mit stateJson (zum Laden)
  if (id) {
    const query = encodeURIComponent(`*[_type == "heizlastProject" && _id == "${id}"][0]`);
    try {
      const resp = await fetch(
        `https://${projectId}.api.sanity.io/v2024-03-01/data/query/${dataset}?query=${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      return new Response(JSON.stringify({ success: true, project: data.result }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Liste ohne stateJson (kompakter)
  const query = encodeURIComponent(
    `*[_type == "heizlastProject"]|order(updatedAt desc){_id, projectName, customerName, address, qhl, qh, ebf, status, createdAt, updatedAt, notes}`
  );
  try {
    const resp = await fetch(
      `https://${projectId}.api.sanity.io/v2024-03-01/data/query/${dataset}?query=${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await resp.json();
    return new Response(JSON.stringify({ success: true, projects: data.result || [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/heizlast-projects  → Projekt speichern (create oder update via _id)
export async function onRequestPost(context) {
  if (!checkAuth(context)) return unauthorized();
  const { token, projectId, dataset } = getSanityConfig(context.env);
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Kein Sanity-Token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const {
      id, projectName, customerName, address, qhl, qh, ebf, stateJson, status, notes,
    } = body;

    const now = new Date().toISOString();
    const doc = {
      _type: 'heizlastProject',
      projectName: projectName || 'Unbenannt',
      customerName: customerName || '',
      address: address || '',
      qhl: typeof qhl === 'number' ? qhl : null,
      qh: typeof qh === 'number' ? qh : null,
      ebf: typeof ebf === 'number' ? ebf : null,
      stateJson: stateJson || '{}',
      status: status || 'arbeit',
      notes: notes || '',
      updatedAt: now,
    };

    let mutation;
    if (id) {
      mutation = { createOrReplace: { ...doc, _id: id, createdAt: body.createdAt || now } };
    } else {
      mutation = { create: { ...doc, createdAt: now } };
    }

    const resp = await fetch(
      `https://${projectId}.api.sanity.io/v2024-03-01/data/mutate/${dataset}?returnIds=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mutations: [mutation] }),
      }
    );
    const data = await resp.json();

    if (data.error) {
      return new Response(JSON.stringify({ success: false, error: data.error.description || 'Sanity-Fehler' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newId = data.results?.[0]?.id || id;
    return new Response(JSON.stringify({ success: true, id: newId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/heizlast-projects?id=xxx
export async function onRequestDelete(context) {
  if (!checkAuth(context)) return unauthorized();
  const { token, projectId, dataset } = getSanityConfig(context.env);
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Kein Sanity-Token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Keine ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const resp = await fetch(
      `https://${projectId}.api.sanity.io/v2024-03-01/data/mutate/${dataset}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mutations: [{ delete: { id } }] }),
      }
    );
    const data = await resp.json();
    if (data.error) {
      return new Response(JSON.stringify({ success: false, error: data.error.description }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
