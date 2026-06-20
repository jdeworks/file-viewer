export default {
  id: 'immich-config',
  label: 'Immich Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'immich.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Immich photo/video management environment-variable configuration (key=value style).',
    tags: ['immich', 'photos', 'video', 'self-hosted', 'config'],
  },
};
