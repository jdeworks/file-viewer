export default {
  id: 'package-swift',
  label: 'Swift Package',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n === 'Package.swift';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Swift Package Manager manifest — defines package name, products, targets, dependencies, and supported platforms.' },
};
