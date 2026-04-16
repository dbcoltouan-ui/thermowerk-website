// Schema: Heizlast-Projekte (Cloud-Speicherung für Thermowerk Heizlast Tool)
export default {
  name: 'heizlastProject',
  title: 'Heizlast-Projekte',
  type: 'document',
  fields: [
    {
      name: 'projectName',
      title: 'Projektname',
      type: 'string',
      description: 'Kurzbezeichnung (z.B. Kunde + Ort)',
    },
    {
      name: 'customerName',
      title: 'Kunde',
      type: 'string',
      description: 'Name des Kunden',
    },
    {
      name: 'address',
      title: 'Objekt-Adresse',
      type: 'string',
    },
    {
      name: 'qhl',
      title: 'Heizlast Qhl (kW)',
      type: 'number',
      description: 'Berechnete Heizlast des Gebäudes',
      readOnly: true,
    },
    {
      name: 'qh',
      title: 'Gesamtleistung Qh (kW)',
      type: 'number',
      description: 'Erforderliche WP-Leistung inkl. WW + Zuschläge',
      readOnly: true,
    },
    {
      name: 'ebf',
      title: 'EBF (m²)',
      type: 'number',
      readOnly: true,
    },
    {
      name: 'stateJson',
      title: 'Projekt-Daten (JSON)',
      type: 'text',
      rows: 10,
      description: 'Vollständiger Tool-State - nicht von Hand editieren',
    },
    {
      name: 'createdAt',
      title: 'Erstellt am',
      type: 'datetime',
      readOnly: true,
    },
    {
      name: 'updatedAt',
      title: 'Zuletzt gespeichert',
      type: 'datetime',
      readOnly: true,
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'In Arbeit', value: 'arbeit' },
          { title: 'Offeriert', value: 'offeriert' },
          { title: 'Bestellt', value: 'bestellt' },
          { title: 'Abgeschlossen', value: 'abgeschlossen' },
          { title: 'Archiv', value: 'archiv' },
        ],
        layout: 'radio',
      },
      initialValue: 'arbeit',
    },
    {
      name: 'notes',
      title: 'Notizen',
      type: 'text',
      rows: 3,
    },
  ],
  orderings: [
    {
      title: 'Neueste zuerst',
      name: 'updatedDesc',
      by: [{ field: 'updatedAt', direction: 'desc' }],
    },
    {
      title: 'Name A-Z',
      name: 'nameAsc',
      by: [{ field: 'projectName', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'projectName',
      customer: 'customerName',
      qhl: 'qhl',
      status: 'status',
      updated: 'updatedAt',
    },
    prepare({ title, customer, qhl, status, updated }: any) {
      const statusEmoji =
        status === 'arbeit' ? '🔧' :
        status === 'offeriert' ? '📋' :
        status === 'bestellt' ? '✅' :
        status === 'abgeschlossen' ? '🏁' :
        status === 'archiv' ? '📦' : '•';
      const qhlStr = qhl ? ` · ${qhl.toFixed(2)} kW` : '';
      const dateStr = updated ? new Date(updated).toLocaleDateString('de-CH') : '';
      return {
        title: `${statusEmoji} ${title || 'Unbenannt'}${qhlStr}`,
        subtitle: [customer, dateStr].filter(Boolean).join(' · '),
      };
    },
  },
};
