// Schema: Kostenrechner-Sektion
export default {
  name: 'calculatorSection',
  title: 'Kostenrechner',
  type: 'document',
  groups: [
    { name: 'text', title: 'Texte' },
    { name: 'defaults', title: 'Standardwerte' },
  ],
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string', group: 'text' },
    { name: 'subheadline', title: 'Unterüberschrift', type: 'string', group: 'text' },
    { name: 'description', title: 'Beschreibung', type: 'text', rows: 3, group: 'text' },
    { name: 'savingLabel', title: 'Label Einsparung', type: 'string', group: 'text', initialValue: 'Ihre geschätzte Einsparung pro Jahr' },
    { name: 'disclaimer', title: 'Disclaimer-Text', type: 'text', rows: 3, group: 'text' },
    { name: 'ctaText', title: 'CTA Button Text', type: 'string', group: 'text' },
    { name: 'ctaLink', title: 'CTA Button Link', type: 'string', group: 'text' },
    // Standardwerte
    { name: 'defaultArea', title: 'Standard Wohnfläche (m²)', type: 'number', group: 'defaults', initialValue: 160 },
    { name: 'defaultElecPrice', title: 'Standard Strompreis (Rp/kWh)', type: 'number', group: 'defaults', initialValue: 27 },
    { name: 'defaultOilPrice', title: 'Standard Ölpreis (Rp/l)', type: 'number', group: 'defaults', initialValue: 120 },
    { name: 'defaultGasPrice', title: 'Standard Gaspreis (Rp/kWh)', type: 'number', group: 'defaults', initialValue: 13 },
    { name: 'jaz', title: 'JAZ (Jahresarbeitszahl)', type: 'number', group: 'defaults', initialValue: 3.2 },
  ],
  preview: {
    prepare() { return { title: 'Kostenrechner' }; },
  },
};
