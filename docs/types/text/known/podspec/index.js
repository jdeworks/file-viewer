export default {
  id: 'podspec',
  label: 'CocoaPods Podspec',
  match(intake) {
    return (intake.name || intake.filename || '').endsWith('.podspec');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CocoaPods pod specification — describes a library\'s metadata, source, and dependencies for distribution via CocoaPods.',
    usedFor: [{ label: 'CocoaPods', description: 'Package specification for the CocoaPods dependency manager for iOS/macOS', href: 'https://guides.cocoapods.org/syntax/podspec.html' }],
  },
};
