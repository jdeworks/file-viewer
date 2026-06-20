export default {
  id: 'bookstack-config',
  label: 'BookStack Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'bookstack.env') return true;
    const text = intake.text || '';
    return text.includes('APP_KEY') && text.includes('APP_URL') && text.toLowerCase().includes('bookstack');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'BookStack self-hosted wiki/documentation platform environment config (Laravel-based) — app, database, mail, auth, cache, and storage settings.',
    tags: ['bookstack', 'wiki', 'knowledge-base', 'laravel', 'env', 'self-hosted'],
  },
};
