export default {
  id: 'windsurfrules',
  label: '.windsurfrules',
  match: (intake) => {
    return (intake.filename || '').split('/').pop() === '.windsurfrules';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Windsurf AI editor rules file — shows coding standards and rule sections for the AI assistant.' },
};
