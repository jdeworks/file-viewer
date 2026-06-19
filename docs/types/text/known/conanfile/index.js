export default {
  id: 'conanfile',
  label: 'Conan',
  match(intake) {
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === 'conanfile.txt' || n === 'conanfile.py';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Conan C/C++ package manager manifest — declares dependencies, generators, and build options.',
    usedFor: [
      { label: 'C/C++ dependencies', description: 'Manage C/C++ library dependencies with Conan', href: 'https://conan.io/' },
    ],
  },
};
