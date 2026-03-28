// Schema: Navigation / Header
export default {
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    { name: 'ctaButtonText', title: 'CTA Button Text', type: 'string', description: 'z.B. "Beratung anfragen"' },
    { name: 'ctaButtonLink', title: 'CTA Button Link', type: 'string' },
    { name: 'stoerungText', title: 'Störung-Button Text (Mobile)', type: 'string' },
    { name: 'stoerungLink', title: 'Störung-Button Link', type: 'string' },
    {
      name: 'items',
      title: 'Menüpunkte',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'label', title: 'Text', type: 'string' },
          { name: 'href', title: 'Link', type: 'string' },
          { name: 'mobileOnly', title: 'Nur Mobile', type: 'boolean', initialValue: false },
          {
            name: 'children',
            title: 'Untermenü',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                { name: 'label', title: 'Text', type: 'string' },
                { name: 'href', title: 'Link', type: 'string' },
              ],
            }],
          },
        ],
        preview: { select: { title: 'label' } },
      }],
    },
  ],
  preview: {
    prepare() { return { title: 'Navigation' }; },
  },
};
