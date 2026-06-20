export default {
  id: 'linkwarden-config',
  label: 'Linkwarden Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'linkwarden.env') return true;
    if (n === '.env') {
      const t = intake.text || '';
      return t.includes('NEXTAUTH_SECRET') && t.includes('PAGINATION_TAKE_COUNT');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linkwarden self-hosted bookmark manager and link archiver environment configuration — auth, database, storage, pagination, and SSO settings.',
    tags: ['linkwarden', 'bookmarks', 'self-hosted', 'nextjs', 'env'],
  },
};
