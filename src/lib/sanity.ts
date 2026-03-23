import { createClient } from '@sanity/client';

// Sanity-Client-Konfiguration
export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || 'wpbatz1m',
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});
