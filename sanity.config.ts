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

// WP-Datenbank (Session 10 — Sanity-Migration der Excel-Datenbank v1.0)
import {
  wpHauptgeraet,
  wpKomponenteStamm,
  wpMapping,
  wpKonfigVariable,
  wpDatenblatt,
} from './sanity/schemas/wp-datenbank';

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
            // ─── Website ───────────────────────────────────────────────
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

            // ─── WP-Datenbank ──────────────────────────────────────────
            S.divider(),
            S.listItem()
              .title('WP-Datenbank — Hauptgeräte')
              .child(
                S.list()
                  .title('Hauptgeräte nach Marke / kW')
                  .items([
                    S.listItem().title('Alle Geräte').child(S.documentTypeList('wpHauptgeraet').title('Alle Hauptgeräte')),
                    S.divider(),
                    S.listItem()
                      .title('Bosch')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Bosch Hauptgeräte')
                          .filter('_type == "wpHauptgeraet" && marke == "Bosch"')
                      ),
                    S.listItem()
                      .title('Panasonic')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Panasonic Hauptgeräte')
                          .filter('_type == "wpHauptgeraet" && marke == "Panasonic"')
                      ),
                    S.listItem()
                      .title('Oertli')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Oertli Hauptgeräte')
                          .filter('_type == "wpHauptgeraet" && marke == "Oertli"')
                      ),
                    S.divider(),
                    S.listItem()
                      .title('< 10 kW')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Hauptgeräte < 10 kW')
                          .filter('_type == "wpHauptgeraet" && leistung.heizleistungA7W35 < 10')
                      ),
                    S.listItem()
                      .title('10 – 20 kW')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Hauptgeräte 10–20 kW')
                          .filter('_type == "wpHauptgeraet" && leistung.heizleistungA7W35 >= 10 && leistung.heizleistungA7W35 < 20')
                      ),
                    S.listItem()
                      .title('≥ 20 kW')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Hauptgeräte ≥ 20 kW')
                          .filter('_type == "wpHauptgeraet" && leistung.heizleistungA7W35 >= 20')
                      ),
                    S.divider(),
                    S.listItem()
                      .title('Aufstellung Aussen')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Aussen-Aufstellung')
                          .filter('_type == "wpHauptgeraet" && aufstellung == "Aussen"')
                      ),
                    S.listItem()
                      .title('Aufstellung Innen')
                      .child(
                        S.documentTypeList('wpHauptgeraet')
                          .title('Innen-Aufstellung')
                          .filter('_type == "wpHauptgeraet" && aufstellung == "Innen"')
                      ),
                  ])
              ),
            S.listItem()
              .title('WP-Datenbank — Komponenten (Stamm)')
              .child(
                S.list()
                  .title('Komponenten nach Kategorie')
                  .items([
                    S.listItem().title('Alle Komponenten').child(S.documentTypeList('wpKomponenteStamm').title('Alle Komponenten')),
                    S.divider(),
                    ...[
                      'Aufstellung',
                      'Pufferspeicher',
                      'Brauchwarmwasserspeicher',
                      'Sicherheit',
                      'Pumpengruppe',
                      'Plattentauscher',
                      'Fernleitung',
                      'Anschluss',
                      'Schallschutz',
                      'Luftkanal',
                      'Regelung',
                      'Heizwasseraufbereitung',
                      'Dienstleistung',
                      'Zubehör',
                    ].map((kat) =>
                      S.listItem()
                        .id(`kat-${kat}`)
                        .title(kat)
                        .child(
                          S.documentTypeList('wpKomponenteStamm')
                            .title(kat)
                            .filter('_type == "wpKomponenteStamm" && kategorie == $kat')
                            .params({ kat })
                        )
                    ),
                    S.divider(),
                    S.listItem()
                      .title('⚠ Deprecated')
                      .child(
                        S.documentTypeList('wpKomponenteStamm')
                          .title('Deprecated')
                          .filter('_type == "wpKomponenteStamm" && deprecated == true')
                      ),
                    S.listItem()
                      .title('Bauseits')
                      .child(
                        S.documentTypeList('wpKomponenteStamm')
                          .title('Bauseits')
                          .filter('_type == "wpKomponenteStamm" && bauseits == true')
                      ),
                  ])
              ),
            S.listItem()
              .title('WP-Datenbank — Mappings')
              .child(
                S.list()
                  .title('Mappings nach Pflicht-Typ')
                  .items([
                    S.listItem().title('Alle Mappings').child(S.documentTypeList('wpMapping').title('Alle Mappings')),
                    S.divider(),
                    S.listItem()
                      .title('required')
                      .child(
                        S.documentTypeList('wpMapping').title('required').filter('_type == "wpMapping" && pflichtTyp == "required"')
                      ),
                    S.listItem()
                      .title('oneOf')
                      .child(
                        S.documentTypeList('wpMapping').title('oneOf').filter('_type == "wpMapping" && pflichtTyp == "oneOf"')
                      ),
                    S.listItem()
                      .title('anyOf')
                      .child(
                        S.documentTypeList('wpMapping').title('anyOf').filter('_type == "wpMapping" && pflichtTyp == "anyOf"')
                      ),
                    S.listItem()
                      .title('optional')
                      .child(
                        S.documentTypeList('wpMapping').title('optional').filter('_type == "wpMapping" && pflichtTyp == "optional"')
                      ),
                    S.listItem()
                      .title('dienstleistung')
                      .child(
                        S.documentTypeList('wpMapping')
                          .title('dienstleistung')
                          .filter('_type == "wpMapping" && pflichtTyp == "dienstleistung"')
                      ),
                    S.divider(),
                    S.listItem()
                      .title('★ Default-Auswahl (default=ja)')
                      .child(
                        S.documentTypeList('wpMapping')
                          .title('Default ja')
                          .filter('_type == "wpMapping" && default == "ja"')
                      ),
                    S.listItem()
                      .title('Bedingt (Bedingt_durch != "")')
                      .child(
                        S.documentTypeList('wpMapping')
                          .title('Bedingte Mappings')
                          .filter('_type == "wpMapping" && defined(bedingtDurch) && bedingtDurch != ""')
                      ),
                  ])
              ),
            S.listItem()
              .title('WP-Datenbank — Konfig-Variablen')
              .child(S.documentTypeList('wpKonfigVariable').title('Konfig-Variablen (20)')),
            S.listItem()
              .title('WP-Datenbank — Datenblätter')
              .child(S.documentTypeList('wpDatenblatt').title('Datenblätter (16)')),
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
      // WP-Datenbank
      wpHauptgeraet,
      wpKomponenteStamm,
      wpMapping,
      wpKonfigVariable,
      wpDatenblatt,
    ],
  },
});
