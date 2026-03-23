import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import siteSettings from './sanity/schemas/siteSettings';
import heroSection from './sanity/schemas/heroSection';
import aboutSection from './sanity/schemas/aboutSection';
import stepsSection from './sanity/schemas/stepsSection';
import wpsmSection from './sanity/schemas/wpsmSection';
import whySection from './sanity/schemas/whySection';
import regionSection from './sanity/schemas/regionSection';
import contactSection from './sanity/schemas/contactSection';

// Sanity Studio Konfiguration
export default defineConfig({
  name: 'thermowerk',
  title: 'Thermowerk CMS',
  projectId: 'wpbatz1m',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {
    types: [
      siteSettings,
      heroSection,
      aboutSection,
      stepsSection,
      wpsmSection,
      whySection,
      regionSection,
      contactSection,
    ],
  },
});
