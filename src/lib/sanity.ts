import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// Sanity-Client-Konfiguration
export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || 'wpbatz1m',
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: '2024-03-01',
  useCdn: true,
  token: import.meta.env.SANITY_API_TOKEN,
});

// Image URL Builder
const builder = imageUrlBuilder(sanityClient);
export function urlFor(source: any) {
  return builder.image(source);
}

// Singleton-Dokumente laden (z.B. siteSettings, heroSection)
export async function getSingleton<T = any>(type: string): Promise<T | null> {
  return sanityClient.fetch<T>(
    `*[_type == $type][0]`,
    { type }
  );
}

// Einzelne Seite laden (für Impressum, Datenschutz etc.)
export async function getPage(type: string) {
  return sanityClient.fetch(`*[_type == $type][0]`, { type });
}

// Alle Sektionsdaten auf einmal laden (für Startseite)
export async function getAllSections() {
  const query = `{
    "settings": *[_type == "siteSettings"][0],
    "navigation": *[_type == "navigation"][0],
    "hero": *[_type == "heroSection"][0],
    "services": *[_type == "servicesSection"][0],
    "logos": *[_type == "manufacturerLogos"][0],
    "wpsm": *[_type == "wpsmSection"][0],
    "steps": *[_type == "stepsSection"][0],
    "about": *[_type == "aboutSection"][0],
    "why": *[_type == "whySection"][0],
    "klima": *[_type == "klimaSection"][0],
    "calculator": *[_type == "calculatorSection"][0],
    "region": *[_type == "regionSection"][0],
    "contact": *[_type == "contactSection"][0],
    "footer": *[_type == "footerSection"][0]
  }`;
  return sanityClient.fetch(query);
}
