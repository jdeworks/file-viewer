export default {
  id: 'plausible-config',
  label: 'Plausible Analytics Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'plausible.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Plausible Analytics self-hosted server environment configuration — server, security, database, email, and OAuth settings.',
    tags: ['plausible', 'analytics', 'self-hosted', 'config'],
  },
};
