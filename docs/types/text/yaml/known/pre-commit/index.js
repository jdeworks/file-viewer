export default {
  id: 'pre-commit',
  label: 'pre-commit config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.pre-commit-config.yaml', '.pre-commit-config.yml',
            'pre-commit-config.yaml', 'pre-commit-config.yml'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'pre-commit configuration — lists repos and hooks that enforce code quality on git commit.',
    usedFor: [{ label: 'Git hooks', description: 'Run automated checks before each commit', href: 'https://pre-commit.com' }],
  },
};
