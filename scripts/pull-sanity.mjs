// Zieht alle Sanity-Daten und speichert sie als JSON-Export
// Verwendung: node scripts/pull-sanity.mjs
import { createClient } from '@sanity/client';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = createClient({
  projectId: 'wpbatz1m',
  dataset: 'production',
  apiVersion: '2024-03-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function pull() {
  console.log('Lade alle Sanity-Dokumente...\n');

  const query = `{
    "siteSettings": *[_type == "siteSettings"][0],
    "navigation": *[_type == "navigation"][0],
    "heroSection": *[_type == "heroSection"][0],
    "servicesSection": *[_type == "servicesSection"][0],
    "manufacturerLogos": *[_type == "manufacturerLogos"][0],
    "wpsmSection": *[_type == "wpsmSection"][0],
    "stepsSection": *[_type == "stepsSection"][0],
    "aboutSection": *[_type == "aboutSection"][0],
    "whySection": *[_type == "whySection"][0],
    "klimaSection": *[_type == "klimaSection"][0],
    "calculatorSection": *[_type == "calculatorSection"][0],
    "regionSection": *[_type == "regionSection"][0],
    "contactSection": *[_type == "contactSection"][0],
    "footerSection": *[_type == "footerSection"][0],
    "impressumPage": *[_type == "impressumPage"][0],
    "datenschutzPage": *[_type == "datenschutzPage"][0]
  }`;

  const data = await client.fetch(query);

  // Sanity-interne Felder entfernen für Lesbarkeit
  function clean(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(clean);
    const cleaned = {};
    for (const [key, val] of Object.entries(obj)) {
      if (['_rev', '_updatedAt', '_createdAt'].includes(key)) continue;
      cleaned[key] = clean(val);
    }
    return cleaned;
  }

  const cleaned = clean(data);
  const outPath = resolve(__dirname, '..', 'sanity-export.json');
  writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf-8');

  const sections = Object.keys(cleaned).filter(k => cleaned[k]);
  console.log(`✅ ${sections.length} Dokumente exportiert nach: sanity-export.json`);
  console.log(`   Enthält: ${sections.join(', ')}`);
}

pull().catch((err) => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
