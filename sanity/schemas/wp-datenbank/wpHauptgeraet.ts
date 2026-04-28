// Schema: WP-Datenbank — Hauptgerät (Wärmepumpe)
// Quelle: Datenbank_Waermepumpen_v1.0.xlsx > Sheet "Hauptgeräte" (47 Einträge)
// Spec: Review_WP_Datenbank_v0.2/04_Tool_Uebernahme/TOOL_UEBERNAHME.md
export default {
  name: 'wpHauptgeraet',
  title: 'WP — Hauptgerät',
  type: 'document',
  groups: [
    { name: 'identitaet', title: 'Identität' },
    { name: 'leistung', title: 'Leistungsdaten' },
    { name: 'kaeltemittel', title: 'Kältemittel' },
    { name: 'schall', title: 'Schall' },
    { name: 'masse', title: 'Masse & Anschluss' },
    { name: 'preis', title: 'Preis' },
    { name: 'verifizierung', title: 'Verifizierung' },
    { name: 'inhalt', title: 'Inhalt & Komponenten' },
    { name: 'medien', title: 'Bilder' },
  ],
  fields: [
    // --- Identität ---
    {
      name: 'id',
      title: 'Geräte-ID',
      type: 'string',
      group: 'identitaet',
      validation: (R: any) => R.required().regex(/^[A-Z]{2}-\d{4}$/, { name: 'BO-/PA-/OE-XXXX' }),
      description: 'BO-XXXX (Bosch), PA-XXXX (Panasonic), OE-XXXX (Oertli)',
    },
    { name: 'marke', title: 'Marke', type: 'string', group: 'identitaet', options: { list: ['Bosch', 'Panasonic', 'Oertli'] } },
    { name: 'serie', title: 'Serie', type: 'string', group: 'identitaet' },
    { name: 'modell', title: 'Modell', type: 'string', group: 'identitaet' },
    { name: 'variante', title: 'Variante (Inneneinheit)', type: 'string', group: 'identitaet' },
    {
      name: 'bauformFamilie',
      title: 'Bauform-Familie',
      type: 'reference',
      to: [{ type: 'wpDatenblatt' }],
      group: 'identitaet',
      description: 'Verweis auf Datenblatt-PDF, das diese Bauform abdeckt',
    },
    { name: 'aufstellung', title: 'Aufstellung', type: 'string', group: 'identitaet', options: { list: ['Aussen', 'Innen'] } },
    { name: 'stromversorgung', title: 'Stromversorgung', type: 'string', group: 'identitaet', options: { list: ['1x230V', '3x400V'] } },

    // --- Leistung ---
    {
      name: 'leistung',
      title: 'Tech. Leistungsdaten',
      type: 'object',
      group: 'leistung',
      fields: [
        { name: 'heizleistungA7W35', title: 'Heizleistung A-7/W35 [kW]', type: 'number' },
        { name: 'copA7W35', title: 'COP A-7/W35', type: 'number' },
        { name: 'copA2W35', title: 'COP A2/W35', type: 'number' },
        { name: 'scop', title: 'SCOP', type: 'string', description: '"—" wenn nicht ausgewiesen (Bosch)' },
        { name: 'vorlaufMax', title: 'Vorlauf max [°C]', type: 'number' },
        { name: 'einsatzgrenzeLuftMin', title: 'Einsatzgrenze Luft min [°C]', type: 'number' },
        { name: 'einsatzgrenzeLuftMax', title: 'Einsatzgrenze Luft max [°C]', type: 'number' },
        { name: 'effizienzklasseVL35', title: 'Effizienzklasse VL35', type: 'string' },
        { name: 'effizienzklasseVL55', title: 'Effizienzklasse VL55', type: 'string' },
        { name: 'aufnahmeleistungA2W35', title: 'Aufnahmeleistung A2/W35 [kW]', type: 'number' },
        { name: 'anlaufstrom', title: 'Anlaufstrom [A]', type: 'number' },
        { name: 'absicherung', title: 'Absicherung', type: 'string' },
      ],
    },

    // --- Kältemittel ---
    {
      name: 'kaeltemittel',
      title: 'Kältemittel',
      type: 'object',
      group: 'kaeltemittel',
      fields: [
        { name: 'typ', title: 'Typ', type: 'string', options: { list: ['R290', 'R32', 'R454C', 'R454B'] } },
        { name: 'fuellmenge', title: 'Füllmenge [kg]', type: 'number' },
        { name: 'co2Aequivalent', title: 'CO₂-Äquivalent [t]', type: 'number' },
      ],
    },

    // --- Schall ---
    {
      name: 'schall',
      title: 'Schall',
      type: 'object',
      group: 'schall',
      fields: [
        { name: 'erp', title: 'Schall ErP [dB(A)]', type: 'number' },
        { name: 'tagMax', title: 'Schall Tag max [dB(A)]', type: 'number' },
        { name: 'nachtMax', title: 'Schall Nacht max [dB(A)]', type: 'string', description: 'kann Bereich enthalten z.B. "41.6-50.0"' },
      ],
    },

    // --- Masse & Anschluss ---
    {
      name: 'masse',
      title: 'Masse & Anschluss',
      type: 'object',
      group: 'masse',
      fields: [
        { name: 'aussenHxBxT', title: 'Aussenmasse HxBxT [mm]', type: 'string' },
        { name: 'gewichtAussen', title: 'Gewicht Aussen [kg]', type: 'number' },
        { name: 'heizungsanschluss', title: 'Heizungsanschluss', type: 'string', description: 'z.B. 1" (DN25)' },
        { name: 'mindestPufferspeicher', title: 'Mindest-Pufferspeicher [L]', type: 'number' },
      ],
    },

    // --- Preis ---
    {
      name: 'preis',
      title: 'Preis',
      type: 'object',
      group: 'preis',
      fields: [
        { name: 'artNr', title: 'Art.-Nr.', type: 'string' },
        { name: 'rabattgruppe', title: 'Rabattgruppe', type: 'string' },
        { name: 'preisChf', title: 'Preis CHF', type: 'number' },
        { name: 'katalogseite', title: 'Katalogseite', type: 'number' },
      ],
    },

    // --- Verifizierung ---
    {
      name: 'verifizierung',
      title: 'Verifizierung',
      type: 'object',
      group: 'verifizierung',
      fields: [
        { name: 'quellePdfSeite', title: 'Quelle PDF-Seite', type: 'number' },
        { name: 'verifiziertAm', title: 'Verifiziert am', type: 'string', description: 'DD.MM.YYYY' },
        { name: 'verifiziertVon', title: 'Verifiziert von', type: 'string' },
      ],
    },

    // --- Inhalt ---
    { name: 'lieferumfang', title: 'Im Lieferumfang (Inneneinheit)', type: 'text', rows: 4, group: 'inhalt' },
    { name: 'bemerkung', title: 'Bemerkung', type: 'text', rows: 3, group: 'inhalt' },
    {
      name: 'pflichtkomponenten',
      title: 'Komponenten-Mappings',
      type: 'array',
      group: 'inhalt',
      of: [{ type: 'reference', to: [{ type: 'wpMapping' }] }],
      description: 'alle wpMapping-Einträge, die zu diesem Gerät gehören',
    },

    // --- Medien ---
    {
      name: 'heroBild',
      title: 'Hauptbild',
      type: 'image',
      group: 'medien',
      options: { hotspot: true },
    },
    {
      name: 'bildergalerie',
      title: 'Weitere Bilder',
      type: 'array',
      group: 'medien',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Bildunterschrift', type: 'string' },
            { name: 'alt', title: 'Alt-Text', type: 'string' },
          ],
        },
      ],
    },
  ],
  preview: {
    select: { id: 'id', marke: 'marke', modell: 'modell', kw: 'leistung.heizleistungA7W35', media: 'heroBild' },
    prepare({ id, marke, modell, kw, media }: any) {
      return {
        title: `${id} — ${marke} ${modell || ''}`,
        subtitle: kw ? `${kw} kW (A-7/W35)` : '',
        media,
      };
    },
  },
  orderings: [
    { title: 'ID aufsteigend', name: 'idAsc', by: [{ field: 'id', direction: 'asc' }] },
    { title: 'Marke + ID', name: 'markeIdAsc', by: [{ field: 'marke', direction: 'asc' }, { field: 'id', direction: 'asc' }] },
    { title: 'Heizleistung kW', name: 'kwAsc', by: [{ field: 'leistung.heizleistungA7W35', direction: 'asc' }] },
  ],
};
