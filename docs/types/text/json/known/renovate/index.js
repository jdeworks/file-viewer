export default {
  id: 'renovate',
  label: 'Renovate config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'renovate.json' || name === 'renovate.json5' || name === '.renovaterc' || name === '.renovaterc.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Renovate dependency update bot configuration — controls how automated PRs are created for package updates.',
    usedFor: [{ label: 'Dependency automation', description: 'Automated dependency updates via Mend Renovate bot', href: 'https://docs.renovatebot.com/configuration-options/' }],
  },
};
