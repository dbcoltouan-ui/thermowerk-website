// Schema: Impressum-Seite
export default {
  name: 'impressumPage',
  title: 'Impressum',
  type: 'document',
  fields: [
    { name: 'pageTitle', title: 'Seitentitel (SEO)', type: 'string', description: 'z.B. "Impressum - Thermowerk"' },
    { name: 'pageDescription', title: 'Meta-Beschreibung (SEO)', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'companyName', title: 'Firmenname', type: 'string' },
    { name: 'address', title: 'Adresse (mehrzeilig)', type: 'text', rows: 4, description: 'Zeilen werden als <br> ausgegeben' },
    { name: 'representativePerson', title: 'Vertretungsberechtigte Person', type: 'string' },
    { name: 'uid', title: 'UID', type: 'string' },
    { name: 'mwst', title: 'MWST-Nummer', type: 'string' },
    { name: 'phone', title: 'Telefon', type: 'string' },
    { name: 'email', title: 'E-Mail', type: 'string' },
    { name: 'web', title: 'Webseite', type: 'string' },
    {
      name: 'sections',
      title: 'Haftungsausschluss-Abschnitte',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'content', title: 'Inhalt', type: 'text', rows: 5 },
        ],
        preview: {
          select: { title: 'title' },
        },
      }],
    },
    { name: 'sourceText', title: 'Quellen-Hinweis', type: 'string', description: 'z.B. "Impressum erstellt durch:"' },
    { name: 'sourceLink', title: 'Quellen-Link URL', type: 'url' },
    { name: 'sourceLinkText', title: 'Quellen-Link Text', type: 'string' },
  ],
  preview: {
    prepare() { return { title: 'Impressum' }; },
  },
};
