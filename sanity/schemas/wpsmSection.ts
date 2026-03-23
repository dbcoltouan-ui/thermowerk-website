// Schema: WPSM-Zertifikate Sektion
export default {
  name: 'wpsmSection',
  title: 'WPSM Zertifikate',
  type: 'document',
  fields: [
    { name: 'subtitle', title: 'Untertitel', type: 'string' },
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'bodyText', title: 'Fliesstext', type: 'array', of: [{ type: 'block' }] },
    { name: 'badgeNumber', title: 'Badge Zahl', type: 'string' },
    { name: 'badgeText', title: 'Badge Text', type: 'string' },
    { name: 'badgeLabel', title: 'Badge Label', type: 'string' },
  ],
};
