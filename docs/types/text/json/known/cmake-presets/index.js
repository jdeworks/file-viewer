export default {
  id: 'cmake-presets',
  label: 'CMake Presets',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.filename || '').split('/').pop();
    return n === 'CMakePresets.json' || n === 'CMakeUserPresets.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CMakePresets.json — reusable named presets for configuring, building, testing, and packaging CMake projects.',
    usedFor: [
      { label: 'CMake build configuration', description: 'Share and reuse CMake configure/build/test settings', href: 'https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html' },
    ],
  },
};
