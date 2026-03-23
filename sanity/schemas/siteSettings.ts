// Schema: Globale Website-Einstellungen
export default {
  name: 'siteSettings',
  title: 'Website-Einstellungen',
  type: 'document',
  fields: [
    { name: 'companyName', title: 'Firmenname', type: 'string' },
    { name: 'phone', title: 'Telefon', type: 'string' },
    { name: 'email', title: 'E-Mail', type: 'string' },
    { name: 'address', title: 'Adresse', type: 'string' },
    { name: 'serviceArea', title: 'Einsatzgebiet', type: 'string' },
    { name: 'openingHours', title: 'Öffnungszeiten', type: 'string' },
  ],
};
