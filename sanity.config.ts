import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import siteSettings from './sanity/schemas/siteSettings';
import navigation from './sanity/schemas/navigation';
import heroSection from './sanity/schemas/heroSection';
import servicesSection from './sanity/schemas/servicesSection';
import manufacturerLogos from './sanity/schemas/manufacturerLogos';
import wpsmSection from './sanity/schemas/wpsmSection';
import stepsSection from './sanity/schemas/stepsSection';
import aboutSection from './sanity/schemas/aboutSection';
import whySection from './sanity/schemas/whySection';
import klimaSection from './sanity/schemas/klimaSection';
import calculatorSection from './sanity/schemas/calculatorSection';
import regionSection from './sanity/schemas/regionSection';
import contactSection from './sanity/schemas/contactSection';
import footerSection from './sanity/schemas/footerSection';
import impressumPage from './sanity/schemas/impressumPage';
import datenschutzPage from './sanity/schemas/datenschutzPage';
import contactSubmission from './sanity/schemas/contactSubmission';
import heizlastProject from './sanity/schemas/heizlastProject';

// Sanity Studio Konfiguration
export default defineConfig({
  name: 'thermowerk',
  title: 'Thermowerk CMS',
  projectId: 'wpbatz1m',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Thermowerk CMS')
          .items([
            S.listItem().title('Website-Einstellungen').child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.listItem().title('Navigation').child(S.document().schemaType('navigation').documentId('navigation')),
            S.divider(),
            S.listItem().title('Hero-Bereich').child(S.document().schemaType('heroSection').documentId('heroSection')),
            S.listItem().title('Leistungen').child(S.document().schemaType('servicesSection').documentId('servicesSection')),
            S.listItem().title('Herstellerlogos').child(S.document().schemaType('manufacturerLogos').documentId('manufacturerLogos')),
            S.listItem().title('WPSM / Förderung').child(S.document().schemaType('wpsmSection').documentId('wpsmSection')),
            S.listItem().title('Ablauf').child(S.document().schemaType('stepsSection').documentId('stepsSection')),
            S.listItem().title('Über Uns').child(S.document().schemaType('aboutSection').documentId('aboutSection')),
            S.listItem().title('Warum Luft-Wasser').child(S.document().schemaType('whySection').documentId('whySection')),
            S.listItem().title('Klimaanlagen').child(S.document().schemaType('klimaSection').documentId('klimaSection')),
            S.listItem().title('Kostenrechner').child(S.document().schemaType('calculatorSection').documentId('calculatorSection')),
            S.listItem().title('Regionaler Service').child(S.document().schemaType('regionSection').documentId('regionSection')),
            S.listItem().title('Kontakt').child(S.document().schemaType('contactSection').documentId('contactSection')),
            S.divider(),
            S.listItem().title('Footer').child(S.document().schemaType('footerSection').documentId('footerSection')),
            S.divider(),
            S.listItem().title('Impressum').child(S.document().schemaType('impressumPage').documentId('impressumPage')),
            S.listItem().title('Datenschutzerklärung').child(S.document().schemaType('datenschutzPage').documentId('datenschutzPage')),
            S.divider(),
            S.listItem().title('Kontaktanfragen').child(
              S.documentTypeList('contactSubmission').title('Kontaktanfragen').defaultOrdering([{ field: 'submittedAt', direction: 'desc' }])
            ),
            S.divider(),
            S.listItem().title('Heizlast-Projekte').child(
              S.documentTypeList('heizlastProject').title('Heizlast-Projekte').defaultOrdering([{ field: 'updatedAt', direction: 'desc' }])
            ),
          ]),
    }),
  ],
  schema: {
    types: [
      siteSettings,
      navigation,
      heroSection,
      servicesSection,
      manufacturerLogos,
      wpsmSection,
      stepsSection,
      aboutSection,
      whySection,
      klimaSection,
      calculatorSection,
      regionSection,
      contactSection,
      footerSection,
      impressumPage,
      datenschutzPage,
      contactSubmission,
      heizlastProject,
    ],
  },
});
