// Schema: WP-Datenbank — Komponenten-Stamm
// Quelle: Datenbank_Waermepumpen_v1.0.xlsx > Sheet "Komponenten_Stamm" (431 Einträge)
// EINZIGE Quelle für Komponenten-Stammdaten (Preis nur hier!)
export default {
  name: 'wpKomponenteStamm',
  title: 'WP — Komponente (Stamm)',
  type: 'document',
  fields: [
    {
      name: 'artNr',
      title: 'Art.-Nr.',
      type: 'string',
      validation: (R: any) => R.required(),
      description: 'Primary Key — = Hersteller-Artikelnummer',
    },
    {
      name: 'kategorie',
      title: 'Kategorie',
      type: 'string',
      options: {
        list: [
          'Aufstellung',
          'Pufferspeicher',
          'Brauchwarmwasserspeicher',
          'Sicherheit',
          'Pumpengruppe',
          'Plattentauscher',
          'Fernleitung',
          'Anschluss',
          'Schallschutz',
          'Luftkanal',
          'Regelung',
          'Heizwasseraufbereitung',
          'Dienstleistung',
          'Zubehör',
        ],
      },
    },
    { name: 'bezeichnung', title: 'Bezeichnung', type: 'string', validation: (R: any) => R.required() },
    { name: 'variante', title: 'Variante', type: 'string' },
    { name: 'rabattgruppe', title: 'Rabattgruppe', type: 'string' },
    { name: 'preisChf', title: 'Preis CHF', type: 'number', description: 'CHF, exkl. MwSt., unverbindl. Preisempfehlung' },
    {
      name: 'einheit',
      title: 'Einheit',
      type: 'string',
      options: { list: ['Stk', 'm', 'kg', 'Pauschal'] },
    },
    { name: 'markeUniversal', title: 'Marke / Universal', type: 'string' },
    { name: 'katalogseite', title: 'Katalogseite', type: 'number' },
    { name: 'quellePdfSeite', title: 'Quelle PDF-Seite', type: 'number' },
    { name: 'verifiziertAm', title: 'Verifiziert am', type: 'string', description: 'DD.MM.YYYY' },
    { name: 'bemerkung', title: 'Bemerkung', type: 'text' },
    {
      name: 'deprecated',
      title: 'Deprecated',
      type: 'boolean',
      initialValue: false,
      description: 'Mit "[DEPRECATED vX.Y]" in der Bezeichnung markierte PLATZ-* Einträge',
    },
    {
      name: 'bauseits',
      title: 'Bauseits',
      type: 'boolean',
      initialValue: false,
      description: 'BAUSEITS-* Komponenten — keine Hersteller-Lieferposition',
    },
  ],
  preview: {
    select: { artNr: 'artNr', bezeichnung: 'bezeichnung', variante: 'variante', preis: 'preisChf', kategorie: 'kategorie', deprecated: 'deprecated' },
    prepare({ artNr, bezeichnung, variante, preis, kategorie, deprecated }: any) {
      const flag = deprecated ? '⚠ DEPRECATED — ' : '';
      return {
        title: `${flag}${artNr} — ${bezeichnung || ''}${variante ? ` (${variante})` : ''}`,
        subtitle: `${kategorie || '?'} · ${preis != null ? preis + ' CHF' : '— CHF'}`,
      };
    },
  },
  orderings: [
    { title: 'Art.-Nr.', name: 'artNrAsc', by: [{ field: 'artNr', direction: 'asc' }] },
    { title: 'Kategorie + Art.-Nr.', name: 'katAsc', by: [{ field: 'kategorie', direction: 'asc' }, { field: 'artNr', direction: 'asc' }] },
    { title: 'Preis CHF (absteigend)', name: 'preisDesc', by: [{ field: 'preisChf', direction: 'desc' }] },
  ],
};
