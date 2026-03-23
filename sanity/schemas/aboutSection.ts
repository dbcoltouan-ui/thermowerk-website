// Schema: Über Uns Sektion
export default {
  name: 'aboutSection',
  title: 'Über Uns',
  type: 'document',
  fields: [
    { name: 'subtitle', title: 'Untertitel', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    {
      name: 'bodyText',
      title: 'Fliesstext',
      type: 'array',
      of: [{ type: 'block' }],
    },
    {
      name: 'promises',
      title: 'Versprechen-Liste',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'string' },
        ],
      }],
    },
  ],
};
