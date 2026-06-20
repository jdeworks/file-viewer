export default {
  id: 'golangci-lint',
  label: 'GolangCI-Lint config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return ['.golangci.yml', '.golangci.yaml', 'golangci.yml', '.golangci.json', '.golangci.toml'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'golangci-lint configuration — defines enabled/disabled linters, run options, and issue exclusion rules for Go projects.',
    usedBy: [{ label: 'Linter aggregator', description: 'Fast linters runner for Go', href: 'https://golangci-lint.run' }],
  },
};
