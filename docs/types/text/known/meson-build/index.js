export default {
  id: 'meson-build',
  label: 'Meson build',
  match(intake) {
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === 'meson.build' || n === 'meson.options';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Meson build system file — defines project, executables, libraries, dependencies, subdirectories, and tests.' },
};
