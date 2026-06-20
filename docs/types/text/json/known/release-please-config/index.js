export const plugin = {
  id: 'release-please',
  label: 'Release Please',
  tags: ['release-please', 'release', 'json'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'release-please-config.json';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Release Please configuration — automates changelog generation and GitHub release creation following Conventional Commits.',
    usedFor: [{ label: 'Automated releases', description: 'Google Release Please bot for automated versioning and changelog generation', href: 'https://github.com/googleapis/release-please' }],
  },
};

export default plugin;
