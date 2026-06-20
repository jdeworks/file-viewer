export default {
  id: 'authentik-config',
  label: 'Authentik Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'authentik.env') return true;
    return (intake.text || '').includes('AUTHENTIK_SECRET_KEY');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Authentik identity provider environment configuration — secrets, database, Redis, email, and listener settings.',
    usedFor: [{ label: 'Authentik', description: 'Self-hosted identity provider and SSO platform.', href: 'https://goauthentik.io' }],
  },
};
