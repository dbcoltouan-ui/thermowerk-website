// Schema: Hero-Bereich
export default {
  name: 'heroSection',
  title: 'Hero-Bereich',
  type: 'document',
  fields: [
    { name: 'headline', title: 'Überschrift', type: 'string' },
    { name: 'subheadline', title: 'Unterüberschrift', type: 'text' },
    { name: 'ctaPrimaryText', title: 'Button 1 Text', type: 'string' },
    { name: 'ctaSecondaryText', title: 'Button 2 Text', type: 'string' },
    { name: 'note', title: 'Hinweis unter Buttons', type: 'string' },
    { name: 'backgroundImage', title: 'Hintergrundbild', type: 'image', options: { hotspot: true } },
  ],
};
