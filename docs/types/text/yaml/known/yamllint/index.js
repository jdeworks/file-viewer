export const plugin = {
  id: 'yamllint',
  label: '.yamllint',
  tags: ['yaml', 'yamllint', 'linting'],
  match(intake) {
    // No baseType guard here on purpose: the bare `.yamllint` dotfile has no .yaml/.yml
    // extension and usually no `---` marker, so the base yaml detector scores it 0 and it
    // never gets baseType.id === 'yaml' — this plugin's filename check is the only signal.
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
