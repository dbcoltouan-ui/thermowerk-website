// Schema: Regionaler Service
export default {
  name: 'regionSection',
  title: 'Regionaler Service',
  type: 'document',
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'bodyText', title: 'Text', type: 'text', rows: 4 },
    {
      name: 'facts',
      title: 'Fakten',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Fettgedruckter Text', type: 'string' },
          { name: 'description', title: 'Beschreibung', type: 'string' },
          { name: 'iconSvg', title: 'Icon SVG-Code', type: 'text', rows: 2 },
        ],
        preview: { select: { title: 'title' } },
      }],
    },
    { name: 'ctaText', title: 'CTA Button Text', type: 'string' },
    { name: 'ctaLink', title: 'CTA Button Link', type: 'string' },
    { name: 'mapEmbedUrl', title: 'Google Maps Embed URL', type: 'url' },
  ],
  preview: {
    prepare() { return { title: 'Regionaler Service' }; },
  },
};
