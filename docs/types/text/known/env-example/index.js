export default {
  id: 'env-example',
  label: 'Env Template',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.env.example' || n === '.env.sample' || n === '.env.template' || n === '.env.dist' || n === 'env.example';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Environment variable template file — shows required configuration keys with placeholder values.',
    usedFor: [{ label: '.env', description: 'Environment variable configuration template', href: 'https://www.dotenv.org/docs/security/env-example' }],
  },
};
