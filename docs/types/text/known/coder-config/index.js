export default {
  id: 'coder-config',
  label: 'Coder Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'coder.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Coder cloud development environment platform configuration — access URL, TLS, PostgreSQL, Prometheus observability, GitHub OAuth2, and OIDC settings.',
    tags: ['coder', 'dev-environments', 'remote-development', 'self-hosted', 'config'],
  },
};
