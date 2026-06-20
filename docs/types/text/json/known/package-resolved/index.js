export default {
  id: 'package-resolved',
  label: 'Swift Package.resolved',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    return (intake.filename || intake.name || '').split('/').pop() === 'Package.resolved';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Swift Package Manager lock file — records the resolved versions of all package dependencies.',
    usedFor: [
      { label: 'Swift packages', description: 'iOS, macOS, and cross-platform Swift projects using SwiftPM' },
    ],
  },
};
