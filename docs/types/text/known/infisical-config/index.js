export default {
  id: 'infisical-config',
  label: 'Infisical Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'infisical.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Infisical secrets management platform .env — server, security/JWT, MongoDB, Redis, SMTP email, and signup settings.',
    tags: ['infisical', 'secrets', 'secrets-management', 'env'],
  },
};
