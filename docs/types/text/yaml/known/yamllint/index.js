export default {
  id: 'yamllint',
  label: 'yamllint config',
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.yamllint' || name === '.yamllint.yml' || name === '.yamllint.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'yamllint configuration — defines YAML linting rules including line length, indentation, truthy values, and other style checks.',
    usedFor: [{ label: 'YAML linting', description: 'Linter for YAML files to enforce style and correctness', href: 'https://yamllint.readthedocs.io/en/stable/configuration.html' }],
  },
};
