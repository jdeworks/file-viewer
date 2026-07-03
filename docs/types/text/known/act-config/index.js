export default {
  id: 'act-config',
  label: 'act config',
  // `.actrc` is owned by the dedicated `actrc` plugin (registered first in known/registry.js,
  // so it always wins matchKnown's first-match-wins for that filename); this plugin only
  // needs to claim the distinct `act.config` name to avoid a fully-shadowed dead branch.
  match: (intake, baseType) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'act.config';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'act local GitHub Actions runner config — shows platform mappings, env vars, and secrets.',
    usedFor: [{ label: 'Dev Tools', description: 'Run GitHub Actions locally with act', href: 'https://github.com/nektos/act#configuration' }],
  },
};
