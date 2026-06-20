export default {
  id: 'wallos-config',
  label: 'Wallos Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'wallos.env') return true;
    const text = intake.text || '';
    return text.includes('APP_NAME=Wallos') || text.includes("APP_NAME='Wallos'") || text.includes('APP_NAME="Wallos"');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Wallos self-hosted subscription and expense tracker environment configuration.',
    tags: ['wallos', 'subscriptions', 'finance', 'self-hosted', 'env'],
  },
};
