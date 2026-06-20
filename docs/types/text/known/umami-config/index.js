export default {
  id: 'umami-config',
  label: 'Umami Analytics Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'umami.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Umami website analytics self-hosted server environment configuration — server, security, database, privacy, and embed settings.',
    tags: ['umami', 'analytics', 'self-hosted', 'config'],
  },
};
