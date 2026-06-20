export default {
  id: 'release-please-config',
  label: 'Release Please config',
  match: (intake, baseType) => {
    if (baseType && baseType.id !== 'json') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'release-please-config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Release Please configuration — automates changelog generation and GitHub release creation following Conventional Commits.',
    usedFor: [{ label: 'Automated releases', description: 'Google Release Please bot for automated versioning and changelog generation', href: 'https://github.com/googleapis/release-please' }],
  },
};
