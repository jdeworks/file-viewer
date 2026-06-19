export default {
  id: 'eslint',
  label: 'ESLint config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.json'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ESLint static analysis configuration — defines parser, plugins, rules, and per-file overrides for JavaScript/TypeScript linting.',
    usedFor: [{ label: 'JavaScript linting', description: 'Pluggable linter for JS/TS code quality and style', href: 'https://eslint.org/docs/latest/use/configure/' }],
  },
};
