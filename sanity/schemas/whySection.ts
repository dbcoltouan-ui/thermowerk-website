// Schema: Warum Luft-Wasser Sektion
export default {
  name: 'whySection',
  title: 'Warum Luft-Wasser',
  type: 'document',
  fields: [
    { name: 'subtitle', title: 'Untertitel', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'introText', title: 'Einleitungstext', type: 'text' },
    { name: 'image', title: 'Bild', type: 'image', options: { hotspot: true } },
    {
      name: 'cards',
      title: 'Karten',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'text' },
        ],
      }],
    },
  ],
};
