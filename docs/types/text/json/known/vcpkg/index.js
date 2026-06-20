export default {
  id: 'vcpkg',
  label: 'vcpkg',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'vcpkg.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'vcpkg manifest — Microsoft C++ package manager dependency list with optional features and overrides.',
    usedFor: [
      { label: 'C++ dependencies', description: 'Declare C++ library dependencies for vcpkg to install', href: 'https://vcpkg.io/' },
    ],
  },
};
