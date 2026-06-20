export default {
  id: 'markdownlint',
  label: 'Markdownlint config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === '.markdownlint.json' || name === '.markdownlint.jsonc' || name === '.markdownlintrc.json' || name === 'markdownlint.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Markdownlint configuration — rules for linting and enforcing consistent Markdown style. Controls which rules are enabled, disabled, or configured with custom options.',
    usedFor: [{ label: 'Markdown linting', description: 'Style checker and linter for Markdown/CommonMark files', href: 'https://github.com/DavidAnson/markdownlint' }],
  },
};
