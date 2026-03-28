// Schema: Leistungen-Sektion
export default {
  name: 'servicesSection',
  title: 'Leistungen',
  type: 'document',
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string' },
    {
      name: 'services',
      title: 'Leistungskarten',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'text', rows: 3 },
          { name: 'image', title: 'Bild', type: 'image', options: { hotspot: true } },
          { name: 'imageAlt', title: 'Bild Alt-Text', type: 'string' },
          { name: 'link', title: 'Link (Anker)', type: 'string', description: 'z.B. #why oder #klima' },
          { name: 'linkText', title: 'Link-Text', type: 'string', initialValue: 'Mehr erfahren' },
        ],
        preview: {
          select: { title: 'title', media: 'image' },
        },
      }],
    },
  ],
  preview: {
    prepare() { return { title: 'Leistungen' }; },
  },
};
