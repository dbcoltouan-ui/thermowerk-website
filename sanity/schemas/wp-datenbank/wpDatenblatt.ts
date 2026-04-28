// Schema: WP-Datenbank — Datenblatt (Bauform-Familie + PDF)
// Quelle: Datenbank_Waermepumpen_v1.0.xlsx > Sheet "Datenblätter" (16 Einträge)
export default {
  name: 'wpDatenblatt',
  title: 'WP — Datenblatt',
  type: 'document',
  fields: [
    {
      name: 'bauformFamilie',
      title: 'Bauform-Familie',
      type: 'string',
      validation: (R: any) => R.required().regex(/^[A-Za-z][A-Za-z0-9_-]*$/, { name: 'ASCII Bezeichner' }),
      description: 'Marke_Serie_Bauform, ASCII-only — z.B. Bosch_CS5800i_AW_wandhaengend',
    },
    {
      name: 'datenblattDatei',
      title: 'Datenblatt PDF',
      type: 'file',
      options: { accept: 'application/pdf' },
      description: 'Datenblatt_<BauformFamilie>.pdf',
    },
    {
      name: 'familienBild',
      title: 'Familien-Hero-Bild (optional)',
      type: 'image',
      options: { hotspot: true },
      description: 'Fallback wenn wpHauptgeraet kein Bild hat',
    },
    { name: 'modellVorlauf', title: 'Modell-Vorlauf [°C]', type: 'number' },
    {
      name: 'abdecktGeraete',
      title: 'Abdeckt Geräte',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'wpHauptgeraet' }] }],
    },
    { name: 'katalogSeitenbereich', title: 'Katalog-Seitenbereich (Druck)', type: 'string' },
    { name: 'pdfSeitenbereich', title: 'PDF-Seitenbereich', type: 'string' },
    { name: 'inhalt', title: 'Inhalt', type: 'text', rows: 4 },
    { name: 'bemerkung', title: 'Bemerkung', type: 'text', rows: 2 },
  ],
  preview: {
    select: { bauformFamilie: 'bauformFamilie', vorlauf: 'modellVorlauf', media: 'familienBild' },
    prepare({ bauformFamilie, vorlauf, media }: any) {
      return {
        title: bauformFamilie,
        subtitle: vorlauf ? `Vorlauf max. ${vorlauf} °C` : '',
        media,
      };
    },
  },
  orderings: [{ title: 'Bauform-Familie', name: 'familieAsc', by: [{ field: 'bauformFamilie', direction: 'asc' }] }],
};
