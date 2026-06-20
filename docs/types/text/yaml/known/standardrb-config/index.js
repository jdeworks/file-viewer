export default {
  id: 'standardrb-config',
  label: 'Standard Ruby config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.standard.yml' || name === '.standard.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.standard.yml — StandardRB linter config: zero-config Ruby linter based on RuboCop.',
    usedFor: [
      { label: 'Linting', description: 'StandardRB: opinionated Ruby linter', href: 'https://github.com/standardrb/standard' },
    ],
  },
};
