export default {
  id: 'hadolint',
  label: 'Hadolint config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.hadolint.yaml' || name === '.hadolint.yml' || name === 'hadolint.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Hadolint Dockerfile linter config — shows ignored rules, allowed registries, and failure threshold.',
    usedFor: [{ label: 'Dockerfile linting', description: 'Dockerfile best-practice linter configuration', href: 'https://github.com/hadolint/hadolint' }],
  },
};
