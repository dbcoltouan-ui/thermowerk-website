// Schema: Warum Luft-Wasser Sektion
export default {
  name: 'whySection',
  title: 'Warum Luft-Wasser',
  type: 'document',
  groups: [
    { name: 'intro', title: 'Intro & Bild' },
    { name: 'cards', title: 'Vorteil-Karten' },
    { name: 'cta', title: 'CTA-Bereich' },
  ],
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string', group: 'intro' },
    { name: 'introText', title: 'Einleitungstext', type: 'text', rows: 4, group: 'intro' },
    { name: 'image', title: 'Bild', type: 'image', options: { hotspot: true }, group: 'intro' },
    { name: 'imageAlt', title: 'Bild Alt-Text', type: 'string', group: 'intro' },
    {
      name: 'cards',
      title: 'Vorteil-Karten',
      type: 'array',
      group: 'cards',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'text', rows: 3 },
          { name: 'iconSvg', title: 'Icon SVG-Code', type: 'text', rows: 2 },
        ],
        preview: { select: { title: 'title' } },
      }],
    },
    // CTA-Bereich
    { name: 'ctaHeadline', title: 'CTA Überschrift', type: 'string', group: 'cta', description: 'z.B. "Welches System passt zu Ihrem Gebäude?"' },
    { name: 'ctaText', title: 'CTA Button Text', type: 'string', group: 'cta' },
    { name: 'ctaLink', title: 'CTA Button Link', type: 'string', group: 'cta' },
    { name: 'calcHintText', title: 'Rechner-Hinweis Text', type: 'string', group: 'cta' },
    { name: 'calcHintButtonText', title: 'Rechner-Button Text', type: 'string', group: 'cta' },
    { name: 'calcHintButtonLink', title: 'Rechner-Button Link', type: 'string', group: 'cta' },
  ],
  preview: {
    prepare() { return { title: 'Warum Luft-Wasser' }; },
  },
};
