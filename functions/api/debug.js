// Temporärer Debug-Endpoint – zeigt ob Env-Vars geladen sind und testet Web3Forms
export async function onRequestGet(context) {
  const web3formsKey = context.env.WEB3FORMS_KEY;

  const result = {
    envVarsLoaded: {
      SANITY_API_TOKEN: context.env.SANITY_API_TOKEN ? 'YES' : 'NOT SET',
      WEB3FORMS_KEY: web3formsKey ? 'YES' : 'NOT SET',
      SANITY_PROJECT_ID: context.env.SANITY_PROJECT_ID || 'NOT SET',
    },
  };

  // Test Web3Forms with proper headers
  if (web3formsKey) {
    try {
      const emailResp = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Thermowerk-Website/1.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject: 'Debug-Test Thermowerk Function',
          from_name: 'Thermowerk Debug',
          name: 'Function Debug',
          email: 'debug@test.com',
          message: 'Gesendet aus Cloudflare Function mit User-Agent Header',
        }),
      });
      const respText = await emailResp.text();
      try {
        result.web3formsResponse = JSON.parse(respText);
      } catch {
        result.web3formsRawResponse = respText.substring(0, 500);
        result.web3formsStatus = emailResp.status;
      }
    } catch (err) {
      result.web3formsError = err.message;
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
