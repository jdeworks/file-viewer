export default {
  id: 'markdownlint-yaml',
  label: 'Markdownlint config',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml' && baseType.id !== 'docker-compose') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.markdownlint.yml' || name === '.markdownlint.yaml' ||
           name === '.markdownlintrc.yml' || name === '.markdownlintrc.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Markdownlint configuration — rules for linting and enforcing consistent Markdown style. Controls which rules are enabled, disabled, or configured with custom options.',
    usedFor: [{ label: 'Markdown linting', description: 'Style checker and linter for Markdown/CommonMark files', href: 'https://github.com/DavidAnson/markdownlint' }],
  },
};
