// Schema: Ablauf-Schritte
export default {
  name: 'stepsSection',
  title: 'Ablauf',
  type: 'document',
  fields: [
    { name: 'subtitle', title: 'Untertitel', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    {
      name: 'steps',
      title: 'Schritte',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'number', title: 'Nummer', type: 'string' },
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'text' },
        ],
      }],
    },
  ],
};
