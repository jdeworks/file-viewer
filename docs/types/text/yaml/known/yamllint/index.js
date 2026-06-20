export const plugin = {
  id: 'yamllint',
  label: '.yamllint',
  tags: ['yaml', 'yamllint', 'linting'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.yamllint' || n === '.yamllint.yml' || n === '.yamllint.yaml';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'yamllint configuration — defines YAML linting rules including line length, indentation, truthy values, and other style checks.',
    usedFor: [{ label: 'YAML linting', description: 'Linter for YAML files to enforce style and correctness', href: 'https://yamllint.readthedocs.io/en/stable/configuration.html' }],
  },
};
export default plugin;
