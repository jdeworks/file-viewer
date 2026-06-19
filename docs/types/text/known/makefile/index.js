export default {
  id: 'makefile',
  label: 'Makefile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'makefile' || name === 'gnumakefile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'GNU Make build automation file — defines targets, dependencies, and build rules.' },
};
