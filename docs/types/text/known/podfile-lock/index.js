export default {
  id: 'podfile-lock',
  label: 'Podfile.lock',
  tags: ['cocoapods', 'ios', 'lockfile'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'podfile.lock';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CocoaPods lockfile — records exact pod versions, dependencies, spec checksums, and the CocoaPods version used.',
    usedFor: [
      { label: 'iOS apps', description: 'Locks CocoaPods dependency versions for reproducible iOS builds' },
      { label: 'macOS apps', description: 'Used in macOS Xcode projects managed with CocoaPods' },
    ],
  },
};
