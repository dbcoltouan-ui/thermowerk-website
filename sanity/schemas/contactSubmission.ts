// Schema: Kontaktanfragen aus dem Formular
export default {
  name: 'contactSubmission',
  title: 'Kontaktanfragen',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string', readOnly: true },
    { name: 'email', title: 'E-Mail', type: 'string', readOnly: true },
    { name: 'phone', title: 'Telefon', type: 'string', readOnly: true },
    { name: 'interest', title: 'Interesse', type: 'string', readOnly: true },
    { name: 'message', title: 'Nachricht', type: 'text', rows: 5, readOnly: true },
    { name: 'submittedAt', title: 'Eingegangen am', type: 'datetime', readOnly: true },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Neu', value: 'neu' },
          { title: 'In Bearbeitung', value: 'bearbeitung' },
          { title: 'Erledigt', value: 'erledigt' },
        ],
        layout: 'radio',
      },
      initialValue: 'neu',
    },
    { name: 'notes', title: 'Interne Notizen', type: 'text', rows: 3 },
  ],
  orderings: [
    { title: 'Neueste zuerst', name: 'dateDesc', by: [{ field: 'submittedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'interest', date: 'submittedAt', status: 'status' },
    prepare({ title, subtitle, date, status }) {
      const statusEmoji = status === 'neu' ? '🔴' : status === 'bearbeitung' ? '🟡' : '✅';
      const dateStr = date ? new Date(date).toLocaleDateString('de-CH') : '';
      return {
        title: `${statusEmoji} ${title || 'Unbekannt'}`,
        subtitle: `${subtitle || ''} · ${dateStr}`.trim(),
      };
    },
  },
};
