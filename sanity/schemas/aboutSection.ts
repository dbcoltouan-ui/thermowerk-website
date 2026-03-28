// Schema: Über Uns Sektion
export default {
  name: 'aboutSection',
  title: 'Über Uns',
  type: 'document',
  groups: [
    { name: 'intro', title: 'Intro & Bild' },
    { name: 'usps', title: 'USP-Karten' },
    { name: 'closing', title: 'Abschluss & CTA' },
  ],
  fields: [
    // Intro
    { name: 'headline', title: 'Überschrift', type: 'string', group: 'intro' },
    { name: 'subheadline', title: 'Unterüberschrift', type: 'string', group: 'intro' },
    { name: 'introText', title: 'Einleitungstext', type: 'array', of: [{ type: 'block' }], group: 'intro' },
    { name: 'image', title: 'Bild (Inhaber/Team)', type: 'image', options: { hotspot: true }, group: 'intro' },
    { name: 'imageAlt', title: 'Bild Alt-Text', type: 'string', group: 'intro' },
    // USP-Karten
    { name: 'uspHeading', title: 'USP-Überschrift', type: 'string', group: 'usps', description: 'z.B. "Was Sie von uns erwarten dürfen:"' },
    {
      name: 'usps',
      title: 'USP-Karten',
      type: 'array',
      group: 'usps',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'text', rows: 3 },
          { name: 'iconSvg', title: 'Icon SVG-Code', type: 'text', rows: 2, description: 'SVG viewBox="0 0 24 24" Inhalt (path/circle/line etc.)' },
        ],
        preview: {
          select: { title: 'title' },
        },
      }],
    },

    // Abschluss
    { name: 'closingText', title: 'Abschlusstext', type: 'array', of: [{ type: 'block' }], group: 'closing' },
    { name: 'ctaText', title: 'CTA Button Text', type: 'string', group: 'closing' },
    { name: 'ctaLink', title: 'CTA Button Link', type: 'string', group: 'closing' },
  ],
  preview: {
    prepare() { return { title: 'Über Uns' }; },
  },
};
