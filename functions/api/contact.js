// Cloudflare Pages Function: Kontaktformular → Sanity speichern
// E-Mail wird client-seitig direkt an Web3Forms gesendet (Cloudflare-zu-Cloudflare Blockade umgehen)
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Honeypot-Check
    if (body.botcheck) {
      return new Response(JSON.stringify({ success: false, error: 'Spam' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, email, phone, interest, message } = body;
    const submittedAt = new Date().toISOString();

    const sanityToken = context.env.SANITY_API_TOKEN;
    const sanityProjectId = context.env.SANITY_PROJECT_ID || 'wpbatz1m';

    let sanityResult = { success: false, error: 'Kein SANITY_API_TOKEN' };

    if (sanityToken) {
      try {
        const resp = await fetch(
          `https://${sanityProjectId}.api.sanity.io/v2024-03-01/data/mutate/production`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sanityToken}`,
            },
            body: JSON.stringify({
              mutations: [
                {
                  create: {
                    _type: 'contactSubmission',
                    name: name || '',
                    email: email || '',
                    phone: phone || '',
                    interest: interest || '',
                    message: message || '',
                    submittedAt,
                    status: 'neu',
                  },
                },
              ],
            }),
          }
        );
        const data = await resp.json();
        sanityResult = { success: !data.error, data };
      } catch (err) {
        sanityResult = { success: false, error: err.message };
      }
    }

    return new Response(JSON.stringify(sanityResult), {
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

// CORS Preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
