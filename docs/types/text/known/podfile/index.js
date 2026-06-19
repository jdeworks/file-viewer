export default {
  id: 'podfile',
  label: 'Podfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'Podfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CocoaPods Podfile — declares iOS/macOS library dependencies for Xcode projects.',
    usedFor: [{ label: 'CocoaPods', description: 'Dependency manager for Swift and Objective-C projects', href: 'https://cocoapods.org' }],
  },
};
