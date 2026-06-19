export default {
  id: 'releaserc',
  label: 'semantic-release config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.releaserc', '.releaserc.json', 'release.config.json'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'semantic-release configuration — automates versioning and package publishing based on conventional commits.',
    usedFor: [{ label: 'Automated releases', description: 'Fully automated semantic versioning and publishing', href: 'https://semantic-release.gitbook.io/semantic-release/usage/configuration' }],
  },
};
