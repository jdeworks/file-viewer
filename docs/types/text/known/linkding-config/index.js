export default {
  id: 'linkding-config',
  label: 'Linkding Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'linkding.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linkding bookmark manager environment-variable configuration — admin, server, database, auth proxy, and feature settings.',
    tags: ['linkding', 'bookmarks', 'self-hosted', 'config'],
  },
};
