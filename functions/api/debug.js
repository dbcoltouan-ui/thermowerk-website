// Temporärer Debug-Endpoint
export async function onRequestGet(context) {
  const web3formsKey = context.env.WEB3FORMS_KEY;
  const result = {};

  if (web3formsKey) {
    try {
      const params = new URLSearchParams();
      params.append('access_key', web3formsKey);
      params.append('subject', 'Debug-Test URL-encoded');
      params.append('from_name', 'Thermowerk Debug');
      params.append('name', 'Function Debug');
      params.append('email', 'debug@test.com');
      params.append('message', 'URL-encoded Test aus Cloudflare Function');

      const emailResp = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const respText = await emailResp.text();
      result.status = emailResp.status;
      try {
        result.response = JSON.parse(respText);
      } catch {
        result.rawResponse = respText.substring(0, 500);
      }
    } catch (err) {
      result.error = err.message;
    }
  } else {
    result.error = 'WEB3FORMS_KEY not set';
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
