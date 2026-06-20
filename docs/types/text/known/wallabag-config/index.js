export default {
  id: 'wallabag-config',
  label: 'Wallabag Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'wallabag.env') return true;
    if (n === '.env') {
      const t = intake.text || '';
      return (
        t.includes('SYMFONY__ENV__DATABASE_DRIVER') ||
        t.includes('WALLABAG_URL') ||
        t.includes('SYMFONY__ENV__SECRET')
      );
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Wallabag self-hosted read-it-later application Symfony .env — app, database, security, email, and Redis settings.',
    tags: ['wallabag', 'read-it-later', 'self-hosted', 'symfony', 'env'],
  },
};
