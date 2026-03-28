// Schema: Herstellerlogos
export default {
  name: 'manufacturerLogos',
  title: 'Herstellerlogos',
  type: 'document',
  fields: [
    {
      name: 'logos',
      title: 'Logos',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'image', title: 'Logo-Bild', type: 'image' },
          { name: 'alt', title: 'Alt-Text / Hersteller', type: 'string' },
          { name: 'size', title: 'Grösse', type: 'string', options: { list: [
            { title: 'Klein', value: 'logo-sm' },
            { title: 'Mittel', value: 'logo-md' },
            { title: 'Normal', value: '' },
          ]}, initialValue: '' },
        ],
        preview: {
          select: { title: 'alt', media: 'image' },
        },
      }],
    },
  ],
  preview: {
    prepare() { return { title: 'Herstellerlogos' }; },
  },
};
