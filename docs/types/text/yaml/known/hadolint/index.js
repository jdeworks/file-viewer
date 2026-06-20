export default {
  id: 'hadolint',
  label: 'Hadolint config',
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.hadolint.yaml' || n === '.hadolint.yml' || n === 'hadolint.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Hadolint Dockerfile linter config — shows ignored rules, allowed registries, and failure threshold.',
    usedFor: [{ label: 'Dockerfile linting', description: 'Dockerfile best-practice linter configuration', href: 'https://github.com/hadolint/hadolint' }],
  },
};
