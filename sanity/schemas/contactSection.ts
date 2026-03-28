// Schema: Kontakt-Sektion
export default {
  name: 'contactSection',
  title: 'Kontakt',
  type: 'document',
  groups: [
    { name: 'header', title: 'Überschriften' },
    { name: 'info', title: 'Kontaktinfos' },
    { name: 'form', title: 'Formular' },
  ],
  fields: [
    { name: 'subtitle', title: 'Untertitel', type: 'string', group: 'header' },
    { name: 'headline', title: 'Überschrift', type: 'string', group: 'header' },
    // Kontaktinfos
    { name: 'phoneLabel', title: 'Telefon Label', type: 'string', group: 'info', initialValue: 'Telefon' },
    { name: 'phoneHours', title: 'Erreichbarkeit', type: 'string', group: 'info', description: 'z.B. Mo-Fr, 07:00-18:00 Uhr' },
    { name: 'emailLabel', title: 'E-Mail Label', type: 'string', group: 'info', initialValue: 'E-Mail' },
    { name: 'locationLabel', title: 'Standort Label', type: 'string', group: 'info', initialValue: 'Standort' },
    { name: 'locationText', title: 'Standort Text', type: 'string', group: 'info' },
    { name: 'locationSubtext', title: 'Einsatzgebiet Text', type: 'string', group: 'info' },
    { name: 'hintText', title: 'Hinweistext', type: 'text', rows: 3, group: 'info' },
    // Formular
    { name: 'formAccessKey', title: 'Web3Forms Access Key', type: 'string', group: 'form' },
    { name: 'formSubject', title: 'E-Mail Betreff', type: 'string', group: 'form', initialValue: 'Neue Anfrage via thermowerk.ch' },
    {
      name: 'formInterests',
      title: 'Interesse-Optionen (Dropdown)',
      type: 'array',
      group: 'form',
      of: [{
        type: 'object',
        fields: [
          { name: 'label', title: 'Anzeige-Text', type: 'string' },
          { name: 'value', title: 'Wert', type: 'string' },
        ],
      }],
    },
    { name: 'formPlaceholderMessage', title: 'Platzhalter Nachricht-Feld', type: 'text', rows: 2, group: 'form' },
    { name: 'formButtonText', title: 'Absende-Button Text', type: 'string', group: 'form', initialValue: 'Anfrage senden' },
    { name: 'formNote', title: 'Hinweis unter Formular', type: 'string', group: 'form' },
  ],
  preview: {
    prepare() { return { title: 'Kontakt' }; },
  },
};
