// Schema: WPSM-Zertifikate Sektion
export default {
  name: 'wpsmSection',
  title: 'WPSM / Förderung',
  type: 'document',
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'bodyText', title: 'Fliesstext', type: 'array', of: [{ type: 'block' }] },
    { name: 'ctaText', title: 'CTA Button Text', type: 'string' },
    { name: 'ctaLink', title: 'CTA Button Link', type: 'string' },
    { name: 'badgeNumber', title: 'Badge Zahl', type: 'number', description: 'z.B. 26' },
    { name: 'badgeText', title: 'Badge Text', type: 'string' },
    { name: 'badgeLabel', title: 'Badge Label', type: 'string' },
  ],
  preview: {
    prepare() { return { title: 'WPSM / Förderung' }; },
  },
};
