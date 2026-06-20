export const plugin = {
  id: 'pre-commit-config',
  label: 'pre-commit config',
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === '.pre-commit-config.yaml' || name === '.pre-commit-config.yml'
      || name === 'pre-commit-config.yaml' || name === 'pre-commit-config.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'pre-commit framework configuration — defines repositories and hooks that run automatically before each git commit to enforce code quality.',
    usedFor: [{ label: 'pre-commit', description: 'A framework for managing and maintaining multi-language pre-commit hooks', href: 'https://pre-commit.com' }],
  },
};
export default plugin;
