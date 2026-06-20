export default {
  id: 'mealie-config',
  label: 'Mealie Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'mealie.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Mealie recipe manager environment-variable configuration (key=value style).',
    tags: ['mealie', 'recipe', 'meal-planning', 'self-hosted', 'config'],
  },
};
