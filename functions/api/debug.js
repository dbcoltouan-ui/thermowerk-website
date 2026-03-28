// Temporärer Debug-Endpoint – zeigt ob Env-Vars geladen sind und testet Web3Forms
export async function onRequestGet(context) {
  const sanityToken = context.env.SANITY_API_TOKEN;
  const web3formsKey = context.env.WEB3FORMS_KEY;
  const sanityProjectId = context.env.SANITY_PROJECT_ID;

  const result = {
    envVars: {
      SANITY_API_TOKEN: sanityToken ? `${sanityToken.substring(0, 8)}...` : 'NOT SET',
      WEB3FORMS_KEY: web3formsKey || 'NOT SET',
      SANITY_PROJECT_ID: sanityProjectId || 'NOT SET',
    },
  };

  // Test Web3Forms if key exists
  if (web3formsKey) {
    try {
      const emailResp = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject: 'Debug-Test Thermowerk Function',
          from_name: 'Thermowerk Debug',
          name: 'Function Debug',
          email: 'debug@test.com',
          message: 'Gesendet aus Cloudflare Function',
        }),
      });
      result.web3formsResponse = await emailResp.json();
    } catch (err) {
      result.web3formsError = err.message;
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
