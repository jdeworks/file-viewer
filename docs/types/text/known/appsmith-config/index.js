export default {
  id: 'appsmith-config',
  label: 'Appsmith Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'appsmith.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Appsmith low-code app builder environment configuration — encryption, database, Redis, email, OAuth, and feature flags.',
    usedFor: [{ label: 'Appsmith', description: 'Appsmith is an open-source low-code platform for building internal tools.', href: 'https://www.appsmith.com/' }],
  },
};
