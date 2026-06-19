export default {
  id: 'bazel',
  label: 'Bazel BUILD / WORKSPACE',
  match: (intake) => {
    const base = (intake.filename || '').split('/').pop();
    return /^(BUILD|BUILD\.bazel|WORKSPACE|WORKSPACE\.bazel)$/.test(base);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Bazel build file — defines targets, dependencies, and build rules for the Bazel build system.' },
};
