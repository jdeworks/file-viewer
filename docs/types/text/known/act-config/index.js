export default {
  id: 'act-config',
  label: 'act config',
  match: (intake, baseType) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.actrc' || name === 'act.config';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'act local GitHub Actions runner config — shows platform mappings, env vars, and secrets.',
    usedFor: [{ label: 'Dev Tools', description: 'Run GitHub Actions locally with act', href: 'https://github.com/nektos/act#configuration' }],
  },
};
