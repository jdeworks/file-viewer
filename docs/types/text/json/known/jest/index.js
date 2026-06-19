export default {
  id: 'jest',
  label: 'Jest config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['jest.config.json', 'jest.config.js', '.jest.config.json'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jest test framework configuration — controls test environment, transforms, coverage thresholds, and module resolution.',
    usedFor: [{ label: 'JavaScript testing', description: 'Delightful JavaScript testing framework with a focus on simplicity', href: 'https://jestjs.io/docs/configuration' }],
  },
};
