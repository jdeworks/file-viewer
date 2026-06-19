export default {
  id: 'vitest',
  label: 'Vitest config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'vitest.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vitest unit test configuration — shows test match patterns, coverage thresholds, and reporters.',
    usedFor: [{ label: 'Unit testing', description: 'Fast Vite-native unit test runner configuration', href: 'https://vitest.dev/config/' }],
  },
};
