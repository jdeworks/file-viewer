export default {
  id: 'makefile',
  label: 'Makefile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'makefile' || n === 'gnumakefile' || n === 'makefile.am' || n === 'makefile.in' || n.endsWith('.mk');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GNU Make build file — defines targets, dependencies, and shell recipes for building software.',
    usedFor: [{ label: 'GNU Make', description: 'Classic build automation tool', href: 'https://www.gnu.org/software/make/manual/' }],
  },
};
