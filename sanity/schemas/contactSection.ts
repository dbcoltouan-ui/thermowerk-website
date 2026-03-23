// Schema: Kontakt-Sektion
export default {
  name: 'contactSection',
  title: 'Kontakt',
  type: 'document',
  fields: [
    { name: 'subtitle', title: 'Untertitel', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'formAccessKey', title: 'Web3Forms Access Key', type: 'string' },
    { name: 'hint', title: 'Hinweistext', type: 'text' },
  ],
};
