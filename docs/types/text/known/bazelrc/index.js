export default {
  id: 'bazelrc',
  label: '.bazelrc',
  match: (intake) => {
    const base = (intake.filename || '').split('/').pop();
    return base === '.bazelrc' || base === 'bazelrc';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Bazel RC configuration file — defines option groups and flags for Bazel commands.' },
};
