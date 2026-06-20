export default {
  id: 'stack-yaml',
  label: 'Haskell Stack',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'stack.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Haskell Stack build configuration — defines the resolver/snapshot, local packages, extra dependencies, and GHC options.',
    usedFor: [
      { label: 'Haskell projects', description: 'Reproducible Haskell builds using the Stack tool' },
    ],
  },
};
