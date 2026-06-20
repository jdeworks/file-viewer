export default {
  id: 'maybe-config',
  label: 'Maybe Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'maybe.env') return true;
    return (intake.text || '').includes('ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Maybe Finance self-hosted personal finance app (Rails) environment configuration — app, security, database, email, features, and synth settings.',
    tags: ['maybe', 'finance', 'rails', 'self-hosted', 'env', 'config'],
  },
};
