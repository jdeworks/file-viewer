export default {
  id: 'outline-config',
  label: 'Outline Wiki Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'outline.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Outline wiki server environment-variable configuration — server, security, database, Redis, S3 storage, OIDC auth, and email settings.',
    tags: ['outline', 'wiki', 'knowledge-base', 'self-hosted', 'config'],
  },
};
