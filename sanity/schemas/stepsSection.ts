// Schema: Ablauf-Schritte
export default {
  name: 'stepsSection',
  title: 'Ablauf',
  type: 'document',
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string' },
    {
      name: 'steps',
      title: 'Schritte',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'number', title: 'Nummer', type: 'string', description: 'z.B. 01, 02' },
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'text', rows: 4 },
        ],
        preview: {
          select: { title: 'title', subtitle: 'number' },
        },
      }],
    },
    { name: 'ctaPreText', title: 'Text über CTA', type: 'string' },
    { name: 'ctaText', title: 'CTA Button Text', type: 'string' },
    { name: 'ctaLink', title: 'CTA Button Link', type: 'string' },
  ],
  preview: {
    prepare() { return { title: 'Ablauf' }; },
  },
};
