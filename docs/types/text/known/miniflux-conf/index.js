export default {
  id: 'miniflux-conf',
  label: 'Miniflux Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'miniflux.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Miniflux RSS reader environment-variable configuration (key=value style).',
    tags: ['miniflux', 'rss', 'atom', 'feed-reader', 'config'],
  },
};
