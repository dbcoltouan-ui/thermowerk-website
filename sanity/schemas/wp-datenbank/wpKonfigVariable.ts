// Schema: WP-Datenbank — Konfig-Variable (Vokabular für Bedingt_durch)
// Quelle: Datenbank_Waermepumpen_v1.0.xlsx > Sheet "Konfig-Variablen" (20 Einträge, ASCII-only)
export default {
  name: 'wpKonfigVariable',
  title: 'WP — Konfig-Variable',
  type: 'document',
  fields: [
    {
      name: 'variable',
      title: 'Variable (ASCII-only)',
      type: 'string',
      validation: (R: any) => R.required().regex(/^[A-Za-z][A-Za-z0-9-]*$/, { name: 'ASCII Bezeichner' }),
    },
    {
      name: 'typ',
      title: 'Typ',
      type: 'string',
      options: { list: ['enum', 'boolean', 'int', 'mm'] },
      validation: (R: any) => R.required(),
    },
    {
      name: 'werteWertebereich',
      title: 'Werte / Wertebereich',
      type: 'string',
      description: 'z.B. "Fundament | Sockel | Wandkonsole" oder "0..200" oder "true|false"',
    },
    { name: 'beschreibung', title: 'Beschreibung', type: 'text', rows: 3 },
    { name: 'beispielVerwendung', title: 'Beispiel-Verwendung in Bedingt_durch', type: 'string' },
  ],
  preview: {
    select: { variable: 'variable', typ: 'typ', werte: 'werteWertebereich' },
    prepare({ variable, typ, werte }: any) {
      return {
        title: variable,
        subtitle: `${typ} · ${werte || ''}`.slice(0, 80),
      };
    },
  },
  orderings: [{ title: 'Variable', name: 'varAsc', by: [{ field: 'variable', direction: 'asc' }] }],
};
