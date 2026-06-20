export default {
  id: 'bookstack-env',
  label: 'BookStack Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'bookstack.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'BookStack wiki/knowledge-base Laravel .env — application, database, email, cache, and storage settings.',
    tags: ['bookstack', 'wiki', 'knowledge-base', 'laravel', 'env'],
  },
};
