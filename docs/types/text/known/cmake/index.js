export default {
  id: 'cmake',
  label: 'CMakeLists',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'cmakelists.txt' || n === 'cmakelists' || n.endsWith('.cmake');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CMake build system configuration — defines targets, dependencies, compiler options, and installation rules.',
    usedFor: [{ label: 'CMake', description: 'Cross-platform build system generator', href: 'https://cmake.org/cmake/help/latest/manual/cmake-language.7.html' }],
  },
};
