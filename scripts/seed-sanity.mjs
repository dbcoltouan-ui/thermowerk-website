// Seed-Script: Befüllt Sanity mit den Originaltexten aus der Website
// Ausführen: node scripts/seed-sanity.mjs

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// .env manuell laden (kein dotenv-Import nötig in Node 20+)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
});

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'wpbatz1m',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function seed() {
  console.log('Starte Sanity-Seed...');

  // Bestehende Dokumente löschen (upsert via _id)
  const docs = [
    {
      _id: 'siteSettings',
      _type: 'siteSettings',
      companyName: 'Thermowerk',
      phone: '+41 XX XXX XX XX',
      email: 'info@thermowerk.ch',
      address: 'Neftenbach, Kanton Zürich',
      serviceArea: 'ZH, SH, TG, AG, ZG, SZ, LU',
      openingHours: 'Mo–Fr, 07:00–18:00 Uhr',
    },
    {
      _id: 'heroSection',
      _type: 'heroSection',
      headline: 'Ihre neue Wärmepumpe. Mit Garantie auf Fördergelder und Effizienz.',
      subheadline: 'Als WPSM-zertifizierter Fachbetrieb stellen wir sicher, dass Sie die maximalen kantonalen Förderbeiträge erhalten und Ihr System hocheffizient läuft.',
      ctaPrimaryText: 'Förderung sichern',
      ctaSecondaryText: "So läuft's ab",
      note: 'Unverbindliche Besichtigung & individuelle Förderberatung.',
    },
    {
      _id: 'aboutSection',
      _type: 'aboutSection',
      subtitle: 'Über Thermowerk',
      headline: 'Ein Fachmann. Ein Ansprechpartner. Von Anfang bis Ende.',
      promises: [
        { _key: 'p1', title: 'Saubere Baustelle', description: 'wir räumen auf, bevor wir gehen.' },
        { _key: 'p2', title: 'Direkte Erreichbarkeit', description: 'persönlich, nicht über eine Zentrale.' },
        { _key: 'p3', title: 'Termintreue', description: 'der vereinbarte Zeitplan wird eingehalten.' },
        { _key: 'p4', title: 'Persönliche Abnahme', description: 'die Anlage wird gemeinsam mit Ihnen geprüft.' },
      ],
    },
    {
      _id: 'stepsSection',
      _type: 'stepsSection',
      subtitle: 'Ablauf',
      headline: 'In vier Schritten zur neuen Heizung',
      steps: [
        { _key: 's1', number: '01', title: 'Vor-Ort-Beratung', description: 'Wir besichtigen Ihr Gebäude, nehmen den Ist-Zustand auf und besprechen Ihre Anforderungen.' },
        { _key: 's2', number: '02', title: 'Planung & Offerte', description: 'Wir erstellen eine Heizlastberechnung, bestimmen die passende Wärmepumpe und planen den hydraulischen Abgleich.' },
        { _key: 's3', number: '03', title: 'Fachgerechte Montage', description: 'Der Inhaber koordiniert und überwacht die gesamte Installation.' },
        { _key: 's4', number: '04', title: 'Inbetriebnahme', description: 'Die Anlage wird einreguliert und Sie erhalten eine Einweisung.' },
      ],
    },
    {
      _id: 'wpsmSection',
      _type: 'wpsmSection',
      subtitle: 'Qualität & Zertifikate',
      headline: 'Ihre Förderbeiträge – gesichert durch das WPSM-Zertifikat',
      badgeNumber: '26',
      badgeText: 'Kantone verlangen das WPSM als Voraussetzung für Förderbeiträge',
      badgeLabel: 'WPSM-zertifizierter Fachbetrieb',
    },
    {
      _id: 'whySection',
      _type: 'whySection',
      subtitle: 'Spezialisierung',
      headline: 'Warum wir auf Luft-Wasser-Wärmepumpen setzen',
      introText: 'Erdsonden-Wärmepumpen haben ihre Berechtigung. Für die meisten Sanierungen im Raum Zürich und Winterthur sind Luft-Wasser-Wärmepumpen aber die praktischere Lösung.',
      cards: [
        { _key: 'c1', title: 'Kürzere Bauzeit', description: 'Keine Bohrungen nötig. Das spart Wochen und vermeidet Bewilligungsverfahren.' },
        { _key: 'c2', title: 'Tiefere Investitionskosten', description: 'Ohne Erdsondenbohrung sinken die Gesamtkosten deutlich.' },
        { _key: 'c3', title: 'PV-kompatibel', description: 'Die Wärmepumpe lässt sich ideal mit Solarstrom betreiben.' },
        { _key: 'c4', title: 'Kühlung im Sommer', description: 'Viele Luft-Wasser-Systeme können im Sommer auch kühlen.' },
      ],
    },
    {
      _id: 'regionSection',
      _type: 'regionSection',
      subtitle: 'Regionaler Service',
      headline: 'Aus Neftenbach – für die ganze Region',
      bodyText: 'Thermowerk hat seinen Sitz in Neftenbach, mitten im Zürcher Weinland.',
      facts: [
        { _key: 'f1', title: 'Keine Anfahrtskosten', description: 'im Umkreis von 50 km ab Neftenbach.' },
        { _key: 'f2', title: 'Reaktion innerhalb 24h', description: 'bei Störungen im Servicegebiet.' },
        { _key: 'f3', title: 'Direkt erreichbar', description: 'in der Regel melden wir uns am selben Tag.' },
      ],
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d172637.4!2d8.55!3d47.53',
    },
    {
      _id: 'contactSection',
      _type: 'contactSection',
      subtitle: 'Kontakt',
      headline: 'Sprechen wir über Ihr Projekt',
      formAccessKey: 'DEIN-ACCESS-KEY-HIER',
      hint: 'Die Beratung vor Ort ist unverbindlich und kostenlos.',
    },
  ];

  for (const doc of docs) {
    try {
      await client.createOrReplace(doc);
      console.log(`✓ ${doc._type} gespeichert`);
    } catch (err) {
      console.error(`✗ Fehler bei ${doc._type}:`, err.message);
    }
  }

  console.log('Seed abgeschlossen!');
}

seed();
