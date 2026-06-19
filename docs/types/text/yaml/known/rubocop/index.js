export default {
  id: 'rubocop',
  label: 'RuboCop config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.rubocop.yml' || name === 'rubocop.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'RuboCop configuration — shows target Ruby version, global settings, and configured cop categories.',
    usedFor: [{ label: 'Linting', description: 'Ruby static analysis with RuboCop', href: 'https://docs.rubocop.org/rubocop/configuration.html' }],
  },
};
