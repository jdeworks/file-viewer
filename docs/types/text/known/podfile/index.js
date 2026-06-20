export default {
  id: 'podfile',
  label: 'Podfile',
  tags: ['cocoapods', 'ios', 'macos', 'swift'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'podfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CocoaPods Podfile — declares iOS/macOS library dependencies for Xcode projects.',
    usedFor: [{ label: 'CocoaPods', description: 'Dependency manager for Swift and Objective-C projects', href: 'https://cocoapods.org' }],
  },
};
