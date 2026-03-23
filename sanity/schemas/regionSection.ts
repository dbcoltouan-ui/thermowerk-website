// Schema: Regionaler Service
export default {
  name: 'regionSection',
  title: 'Regionaler Service',
  type: 'document',
  fields: [
    { name: 'subtitle', title: 'Untertitel', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'bodyText', title: 'Text', type: 'text' },
    {
      name: 'facts',
      title: 'Fakten',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'string' },
        ],
      }],
    },
    { name: 'mapEmbedUrl', title: 'Google Maps Embed URL', type: 'url' },
  ],
};
