export default {
  id: 'vaultwarden-env',
  label: 'Vaultwarden Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'vaultwarden.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vaultwarden (Bitwarden_RS fork) environment-variable configuration — server, security, database, email, and logging settings.',
    tags: ['vaultwarden', 'bitwarden', 'password-manager', 'self-hosted', 'config'],
  },
};
