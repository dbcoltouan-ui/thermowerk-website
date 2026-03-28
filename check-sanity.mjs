import { createClient } from '@sanity/client';

const c = createClient({
  projectId: 'wpbatz1m',
  dataset: 'production',
  apiVersion: '2024-03-01',
  useCdn: false
});

// siteSettings komplett laden
const settings = await c.fetch(`*[_type == "siteSettings"][0]`);
console.log("=== SITE SETTINGS ===");
console.log(JSON.stringify(settings, null, 2));

// Draft-Version prüfen
const draft = await c.fetch(`*[_id == "drafts.siteSettings"][0]`);
console.log("\n=== DRAFT VERSION ===");
console.log(JSON.stringify(draft, null, 2));
