// Schema: Hero-Bereich
export default {
  name: 'heroSection',
  title: 'Hero-Bereich',
  type: 'document',
  fields: [
    { name: 'headlineLine1', title: 'Überschrift Zeile 1', type: 'string', description: 'z.B. "Ihre Wärmepumpe."' },
    { name: 'headlineLine2', title: 'Überschrift Zeile 2', type: 'string', description: 'z.B. "Ihre Klimaanlage."' },
    { name: 'headlineLine3', title: 'Überschrift Zeile 3 (mit Unterstrich)', type: 'string', description: 'z.B. "Unser Handwerk."' },
    { name: 'subtitle', title: 'Untertitel', type: 'string', description: 'z.B. "Mit kompletter Förderabwicklung."' },
    { name: 'text', title: 'Beschreibungstext', type: 'text', rows: 3 },
    { name: 'badgeText', title: 'Badge-Text (unter Buttons)', type: 'string' },
    {
      name: 'ctaPrimary',
      title: 'Button Primär',
      type: 'object',
      fields: [
        { name: 'text', title: 'Text', type: 'string' },
        { name: 'link', title: 'Link', type: 'string' },
      ],
    },
    {
      name: 'ctaSecondary',
      title: 'Button Sekundär',
      type: 'object',
      fields: [
        { name: 'text', title: 'Text', type: 'string' },
        { name: 'link', title: 'Link', type: 'string' },
      ],
    },
    { name: 'backgroundDesktop', title: 'Hintergrundbild Desktop', type: 'image', options: { hotspot: true } },
    { name: 'backgroundMobile', title: 'Hintergrundbild Mobile', type: 'image', options: { hotspot: true } },
    { name: 'overlayOpacity', title: 'Overlay-Deckkraft', type: 'number', description: '0 bis 1, z.B. 0.65', initialValue: 0.65, validation: (Rule: any) => Rule.min(0).max(1) },
    { name: 'overlayColor', title: 'Overlay-Farbe (RGB)', type: 'string', description: 'z.B. 27, 42, 74', initialValue: '27, 42, 74' },
  ],
  preview: {
    select: { title: 'headlineLine1' },
    prepare({ title }: { title: string }) {
      return { title: title || 'Hero-Bereich' };
    },
  },
};
