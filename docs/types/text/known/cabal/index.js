export default {
  id: 'cabal',
  label: 'Haskell Cabal',
  match(intake) {
    return (intake.filename || intake.name || '').split('/').pop().toLowerCase().endsWith('.cabal');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Haskell Cabal package descriptor — defines the package metadata, dependencies, library, executables, test suites, and benchmarks.',
    usedFor: [
      { label: 'Haskell packages', description: 'Haskell library and application package definitions' },
    ],
  },
};
