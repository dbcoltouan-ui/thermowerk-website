import { createClient } from '@sanity/client';
const client = createClient({
  projectId: 'wpbatz1m',
  dataset: 'production',
  apiVersion: '2024-03-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});
try {
  const result = await client.delete('drafts.klimaSection');
  console.log('Draft klimaSection deleted:', result);
} catch (e) {
  console.log('Error:', e.message);
}