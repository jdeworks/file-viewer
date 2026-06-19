export default {
  id: 'cmake',
  label: 'CMakeLists.txt',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'cmakelists.txt';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'CMake build configuration file — defines project structure, targets, dependencies, and build options.' },
};
