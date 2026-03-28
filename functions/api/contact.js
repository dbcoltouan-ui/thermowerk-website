// Cloudflare Pages Function: Kontaktformular verarbeiten
// Speichert in Sanity + sendet E-Mail-Benachrichtigung via Web3Forms
export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();

    // Honeypot-Check (Spam-Schutz)
    if (formData.get('botcheck')) {
      return new Response('Spam erkannt', { status: 403 });
    }

    // Felder extrahieren
    const name = formData.get('name') || '';
    const email = formData.get('email') || '';
    const phone = formData.get('phone') || '';
    const interest = formData.get('interest') || '';
    const message = formData.get('message') || '';
    const submittedAt = new Date().toISOString();

    // Umgebungsvariablen
    const sanityToken = context.env.SANITY_API_TOKEN;
    const web3formsKey = context.env.WEB3FORMS_KEY;
    const sanityProjectId = context.env.SANITY_PROJECT_ID || 'wpbatz1m';

    const interestLabels = {
      waermepumpe: 'Wärmepumpe (Heizungsersatz)',
      klimaanlage: 'Klimaanlage',
      foerderberatung: 'Förderberatung',
      sonstiges: 'Sonstiges',
    };

    // 1. In Sanity speichern (nur wenn Token vorhanden)
    let sanityResult = { skipped: true, reason: 'Kein SANITY_API_TOKEN gesetzt' };
    if (sanityToken) {
      try {
        const sanityResp = await fetch(
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
                    name,
                    email,
                    phone,
                    interest,
                    message,
                    submittedAt,
                    status: 'neu',
                  },
                },
              ],
            }),
          }
        );
        sanityResult = await sanityResp.json();
      } catch (sanityErr) {
        console.error('Sanity-Fehler:', sanityErr);
        sanityResult = { error: sanityErr.message };
      }
    }

    // 2. E-Mail-Benachrichtigung via Web3Forms (unabhängig von Sanity)
    let emailResult = { skipped: true, reason: 'Kein WEB3FORMS_KEY gesetzt' };
    if (web3formsKey) {
      try {
        // URL-encoded statt JSON – umgeht Cloudflare-zu-Cloudflare Blockade (Error 1106)
        const emailParams = new URLSearchParams();
        emailParams.append('access_key', web3formsKey);
        emailParams.append('subject', `Neue Anfrage: ${interestLabels[interest] || interest || 'Allgemein'} – ${name}`);
        emailParams.append('from_name', 'Thermowerk Website');
        emailParams.append('name', name);
        emailParams.append('email', email);
        emailParams.append('phone', phone || '–');
        emailParams.append('interesse', interestLabels[interest] || interest || '–');
        emailParams.append('nachricht', message || '–');
        emailParams.append('eingegangen', new Date(submittedAt).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' }));

        const emailResp = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: emailParams.toString(),
        });
        const emailText = await emailResp.text();
        try {
          emailResult = JSON.parse(emailText);
        } catch {
          emailResult = { status: emailResp.status, raw: emailText.substring(0, 200) };
        }
      } catch (emailErr) {
        console.error('Email-Fehler:', emailErr);
        emailResult = { error: emailErr.message };
      }
    }

    console.log('Sanity:', JSON.stringify(sanityResult));
    console.log('Email:', JSON.stringify(emailResult));

    // Erfolgsseite – Redirect zurück mit Query-Parameter
    const origin = new URL(context.request.url).origin;
    return Response.redirect(`${origin}/?anfrage=gesendet#contact`, 303);
  } catch (err) {
    console.error('Fehler:', err);
    const origin = new URL(context.request.url).origin;
    return Response.redirect(`${origin}/?anfrage=fehler#contact`, 303);
  }
}
