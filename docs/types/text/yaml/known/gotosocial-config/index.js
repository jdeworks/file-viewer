export default {
  id: 'gotosocial-config',
  label: 'GoToSocial Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.yaml' && n !== 'gotosocial-config.yaml') return false;
    const text = intake.text || '';
    return (text.includes('account-domain:') || text.includes('db-type:')) && text.includes('protocol:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GoToSocial ActivityPub social server configuration — server, database, storage, email, and OIDC settings.',
    usedFor: [{ label: 'GoToSocial', description: 'GoToSocial is a lightweight ActivityPub social network server.', href: 'https://gotosocial.org/' }],
  },
};
