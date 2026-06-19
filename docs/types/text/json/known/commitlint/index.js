export default {
  id: 'commitlint',
  label: 'commitlint config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.commitlintrc', '.commitlintrc.json', 'commitlint.config.json'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'commitlint configuration — enforces conventional commit message format with configurable rules.',
    usedFor: [{ label: 'Commit linting', description: 'Lint commit messages to follow conventional commit standards', href: 'https://commitlint.js.org/reference/configuration.html' }],
  },
};
