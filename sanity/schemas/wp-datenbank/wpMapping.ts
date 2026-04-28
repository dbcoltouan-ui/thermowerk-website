// Schema: WP-Datenbank — Komponenten-Mapping (Geräte × Komponenten)
// Quelle: Datenbank_Waermepumpen_v1.0.xlsx > Sheet "Komponenten_Mapping" (3122 Einträge)
export default {
  name: 'wpMapping',
  title: 'WP — Mapping',
  type: 'document',
  fields: [
    {
      name: 'mapId',
      title: 'Map-ID',
      type: 'string',
      validation: (R: any) => R.required().regex(/^M-\d{4}$/),
      description: 'M-0001 .. M-3122',
    },
    {
      name: 'geraet',
      title: 'Gerät',
      type: 'reference',
      to: [{ type: 'wpHauptgeraet' }],
      validation: (R: any) => R.required(),
    },
    {
      name: 'komponente',
      title: 'Komponente',
      type: 'reference',
      to: [{ type: 'wpKomponenteStamm' }],
      validation: (R: any) => R.required(),
    },
    {
      name: 'pflichtTyp',
      title: 'Pflicht-Typ',
      type: 'string',
      options: {
        list: [
          { title: 'required — Zwingend (ggf. unter Bedingt_durch)', value: 'required' },
          { title: 'oneOf — Genau eine der Gruppe', value: 'oneOf' },
          { title: 'anyOf — 0..N der Gruppe', value: 'anyOf' },
          { title: 'optional — Frei wählbar', value: 'optional' },
          { title: 'dienstleistung — Service-Pflicht', value: 'dienstleistung' },
        ],
      },
      validation: (R: any) => R.required(),
    },
    {
      name: 'gruppenId',
      title: 'Gruppen-ID',
      type: 'string',
      description: 'z.B. AUFSTELLUNG_PA9_16, PUFFER_BO0001 — verknüpft oneOf/anyOf-Optionen',
    },
    { name: 'minAuswahl', title: 'Min-Auswahl', type: 'number', initialValue: 0 },
    { name: 'maxAuswahl', title: 'Max-Auswahl', type: 'number', initialValue: 1 },
    {
      name: 'default',
      title: 'Default',
      type: 'string',
      options: { list: ['ja', 'nein'] },
      description: 'in oneOf-Gruppe: "ja" = vorausgewählt',
    },
    {
      name: 'bedingtDurch',
      title: 'Bedingt durch',
      type: 'string',
      description: 'z.B. "Hydraulik!=Direktanschluss UND Heizkreis-Typ-1=ungemischt" — Operatoren =, !=, >, <, >=, <=, UND, ODER',
    },
    { name: 'menge', title: 'Menge', type: 'number', initialValue: 1 },
    { name: 'einheit', title: 'Einheit', type: 'string' },
    {
      name: 'preisChfVlookup',
      title: 'Preis CHF (VLOOKUP)',
      type: 'number',
      description: 'aus komponente.preisChf abgeleitet — bei Import gesetzt; eShop-Lookup-Quelle ist Komponente-Stamm',
    },
    { name: 'bemerkung', title: 'Bemerkung', type: 'text' },
  ],
  preview: {
    select: {
      mapId: 'mapId',
      geraetId: 'geraet.id',
      komponenteArtNr: 'komponente.artNr',
      komponenteBezeichnung: 'komponente.bezeichnung',
      pflicht: 'pflichtTyp',
      gruppe: 'gruppenId',
      def: 'default',
      bedingt: 'bedingtDurch',
    },
    prepare({ mapId, geraetId, komponenteArtNr, komponenteBezeichnung, pflicht, gruppe, def, bedingt }: any) {
      const defFlag = def === 'ja' ? '★ ' : '';
      const bedingtFlag = bedingt ? ' ⓘ' : '';
      return {
        title: `${defFlag}${geraetId || '?'} × ${komponenteArtNr || '?'} ${komponenteBezeichnung ? '— ' + komponenteBezeichnung.slice(0, 40) : ''}`,
        subtitle: `${pflicht}${gruppe ? ' · ' + gruppe : ''}${bedingtFlag} · ${mapId}`,
      };
    },
  },
  orderings: [
    { title: 'Map-ID', name: 'mapIdAsc', by: [{ field: 'mapId', direction: 'asc' }] },
    { title: 'Pflicht-Typ + Map-ID', name: 'pflichtAsc', by: [{ field: 'pflichtTyp', direction: 'asc' }, { field: 'mapId', direction: 'asc' }] },
    { title: 'Gruppen-ID', name: 'gruppeAsc', by: [{ field: 'gruppenId', direction: 'asc' }, { field: 'mapId', direction: 'asc' }] },
  ],
};
