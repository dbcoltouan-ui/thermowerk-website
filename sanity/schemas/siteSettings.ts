// Schema: Globale Website-Einstellungen
export default {
  name: 'siteSettings',
  title: 'Website-Einstellungen',
  type: 'document',
  groups: [
    { name: 'company', title: 'Firma & Kontakt' },
    { name: 'branding', title: 'Branding & Design' },
    { name: 'social', title: 'Social Media' },
    { name: 'seo', title: 'SEO & Meta' },
  ],
  fields: [
    // --- Firma & Kontakt ---
    { name: 'companyName', title: 'Firmenname', type: 'string', group: 'company' },
    { name: 'companyLegalName', title: 'Rechtlicher Name', type: 'string', group: 'company', description: 'z.B. Gebäudetechnik Coltouan' },
    { name: 'phone', title: 'Telefon', type: 'string', group: 'company' },
    { name: 'email', title: 'E-Mail', type: 'string', group: 'company' },
    { name: 'emailPublic', title: 'Öffentliche E-Mail (Website)', type: 'string', group: 'company', description: 'z.B. info@thermowerk.ch' },
    { name: 'address', title: 'Strasse & Nr.', type: 'string', group: 'company' },
    { name: 'plz', title: 'PLZ', type: 'string', group: 'company' },
    { name: 'city', title: 'Ort', type: 'string', group: 'company' },
    { name: 'country', title: 'Land', type: 'string', group: 'company', initialValue: 'Schweiz' },
    { name: 'uid', title: 'UID-Nummer', type: 'string', group: 'company' },
    { name: 'mwst', title: 'MWST-Nummer', type: 'string', group: 'company' },
    { name: 'serviceArea', title: 'Einsatzgebiet', type: 'string', group: 'company', description: 'z.B. ZH, SH, TG, AG, ZG, SZ, LU' },
    { name: 'openingHours', title: 'Öffnungszeiten', type: 'string', group: 'company' },
    { name: 'ownerName', title: 'Inhaber / Vertretungsberechtigte Person', type: 'string', group: 'company' },
    // --- Branding ---
    { name: 'logo', title: 'Logo', type: 'image', group: 'branding', options: { hotspot: true } },
    { name: 'logoAlt', title: 'Logo Alt-Text', type: 'string', group: 'branding', initialValue: 'Thermowerk' },
    { name: 'colorNavy', title: 'Primärfarbe (Navy)', type: 'string', group: 'branding', initialValue: '#1B2A4A', description: 'HEX-Wert' },
    { name: 'colorNavyLight', title: 'Navy Hell', type: 'string', group: 'branding', initialValue: '#243658' },
    { name: 'colorNavyDark', title: 'Navy Dunkel', type: 'string', group: 'branding', initialValue: '#111D33' },
    { name: 'colorRed', title: 'Akzentfarbe (Rot)', type: 'string', group: 'branding', initialValue: '#D93025' },
    { name: 'colorRedHover', title: 'Rot Hover', type: 'string', group: 'branding', initialValue: '#B71C1C' },
    { name: 'fontHeading', title: 'Schriftart Überschriften', type: 'string', group: 'branding', initialValue: 'Outfit', description: 'Google Fonts Name' },
    { name: 'fontBody', title: 'Schriftart Fliesstext', type: 'string', group: 'branding', initialValue: 'DM Sans' },
    { name: 'fontNav', title: 'Schriftart Navigation', type: 'string', group: 'branding', initialValue: 'Montserrat' },
    // --- Social Media ---
    { name: 'instagram', title: 'Instagram URL', type: 'url', group: 'social' },
    { name: 'twitter', title: 'X (Twitter) URL', type: 'url', group: 'social' },
    { name: 'linkedin', title: 'LinkedIn URL', type: 'url', group: 'social' },
    { name: 'facebook', title: 'Facebook URL', type: 'url', group: 'social' },

    // --- SEO ---
    { name: 'seoTitle', title: 'SEO Titel (Startseite)', type: 'string', group: 'seo' },
    { name: 'seoDescription', title: 'Meta Description', type: 'text', group: 'seo', rows: 3 },
    { name: 'ogImage', title: 'Open Graph Bild', type: 'image', group: 'seo' },
  ],
  preview: {
    prepare() {
      return { title: 'Website-Einstellungen' };
    },
  },
};
