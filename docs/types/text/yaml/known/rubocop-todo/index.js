export default {
  id: 'rubocop-todo',
  label: 'RuboCop TODO',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.rubocop_todo.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'RuboCop auto-generated TODO file — lists cops with known violations to progressively fix.',
    usedFor: [{ label: 'RuboCop', description: 'Ruby linter auto-generated TODO list', href: 'https://docs.rubocop.org/rubocop/configuration.html#automatically-generated-configuration' }],
  },
};
