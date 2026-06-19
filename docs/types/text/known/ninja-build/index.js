export default {
  id: 'ninja-build',
  label: 'Ninja build file',
  match: (intake) => {
    const base = (intake.filename || '').split('/').pop().toLowerCase();
    return base === 'build.ninja' || base.endsWith('.ninja');
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Ninja build file — defines build rules, targets and dependencies for the Ninja build system.' },
};
