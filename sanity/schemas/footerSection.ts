// Schema: Footer
export default {
  name: 'footerSection',
  title: 'Footer',
  type: 'document',
  fields: [
    { name: 'brandText', title: 'Markentext', type: 'text', rows: 2, description: 'Kurzbeschreibung unter dem Logo' },
    { name: 'copyrightText', title: 'Copyright Text', type: 'string', description: 'z.B. "2026 Thermowerk - Gebäudetechnik Coltouan"' },
    {
      name: 'navLinks',
      title: 'Navigation Links',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'label', title: 'Text', type: 'string' },
          { name: 'href', title: 'Link', type: 'string' },
        ],
      }],
    },
    {
      name: 'legalLinks',
      title: 'Rechtliche Links',
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
  preview: {
    prepare() { return { title: 'Footer' }; },
  },
};
