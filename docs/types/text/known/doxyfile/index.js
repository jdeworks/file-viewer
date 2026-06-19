export default {
  id: 'doxyfile',
  label: 'Doxyfile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'doxyfile' || n === 'doxyfile.in' || n === 'doxygen.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Doxygen documentation generator configuration — defines project name, input sources, and output formats.' },
};
