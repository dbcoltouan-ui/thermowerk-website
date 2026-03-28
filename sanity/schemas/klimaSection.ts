// Schema: Klimaanlagen-Sektion
export default {
  name: 'klimaSection',
  title: 'Klimaanlagen',
  type: 'document',
  groups: [
    { name: 'header', title: 'Header & Bild' },
    { name: 'types', title: 'Typ-Karten' },
    { name: 'cta', title: 'CTA-Bereich' },
  ],
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string', group: 'header' },
    { name: 'subheadline', title: 'Unterüberschrift', type: 'string', group: 'header' },
    { name: 'introText', title: 'Einleitungstext', type: 'text', rows: 5, group: 'header' },
    { name: 'image', title: 'Bild', type: 'image', options: { hotspot: true }, group: 'header' },
    { name: 'imageAlt', title: 'Bild Alt-Text', type: 'string', group: 'header' },
    {
      name: 'types',
      title: 'Klimatyp-Karten',
      type: 'array',
      group: 'types',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'text', rows: 4 },
          { name: 'iconSvg', title: 'Icon SVG-Code', type: 'text', rows: 2 },
        ],
        preview: { select: { title: 'title' } },
      }],
    },
    { name: 'ctaText', title: 'CTA Text', type: 'string', group: 'cta' },
    { name: 'ctaButtonText', title: 'CTA Button Text', type: 'string', group: 'cta' },
    { name: 'ctaButtonLink', title: 'CTA Button Link', type: 'string', group: 'cta' },
  ],
  preview: {
    prepare() { return { title: 'Klimaanlagen' }; },
  },
};
