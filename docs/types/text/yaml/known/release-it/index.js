export const plugin = {
  id: 'release-it',
  label: 'release-it config',
  tags: ['release', 'versioning', 'changelog', 'npm'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.release-it.yml' || n === '.release-it.yaml' || n === '.release-it.json' || n === '.release-it.js' || n === 'release-it.config.js' || n === 'release-it.config.ts';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'release-it config — automates version bumps, changelog generation, git tagging, and package publishing.',
    usedFor: [{ label: 'Release automation', description: 'release-it handles versioning, changelogs, git tags, GitHub/GitLab releases, and npm publishes', href: 'https://github.com/release-it/release-it' }],
  },
};
export default plugin;
