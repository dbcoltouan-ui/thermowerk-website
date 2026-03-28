// Schema: Datenschutzerklaerung-Seite
export default {
  name: 'datenschutzPage',
  title: 'Datenschutzerklärung',
  type: 'document',
  fields: [
    { name: 'pageTitle', title: 'Seitentitel (SEO)', type: 'string', description: 'z.B. "Datenschutzerklärung - Thermowerk"' },
    { name: 'pageDescription', title: 'Meta-Beschreibung (SEO)', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'lastUpdated', title: 'Letzte Aktualisierung', type: 'string', description: 'z.B. "28.03.2026"' },
    { name: 'introText', title: 'Einleitungstext', type: 'text', rows: 5 },
    {
      name: 'sections',
      title: 'Abschnitte',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Titel', type: 'string' },
          { name: 'content', title: 'Inhalt (HTML erlaubt)', type: 'text', rows: 12, description: 'HTML-Tags wie <ul>, <li>, <strong>, <br>, <a> sind erlaubt' },
        ],
        preview: {
          select: { title: 'title' },
        },
      }],
    },
    { name: 'sourceText', title: 'Quellen-Hinweis', type: 'string' },
    { name: 'sourceLink', title: 'Quellen-Link URL', type: 'url' },
    { name: 'sourceLinkText', title: 'Quellen-Link Text', type: 'string' },
  ],
  preview: {
    prepare() { return { title: 'Datenschutzerklärung' }; },
  },
};
