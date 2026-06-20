export default {
  id: 'ghost-config',
  label: 'Ghost CMS Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'config.production.json' || n === 'config.development.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ghost CMS configuration — server, database, mail, storage, and logging settings.',
    tags: ['ghost', 'cms', 'blog', 'config'],
  },
};
