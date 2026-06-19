export default {
  id: 'xcconfig',
  label: 'Xcode Config',
  match(intake) {
    return (intake.name || intake.filename || '').endsWith('.xcconfig');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Xcode build configuration file — key=value build settings that can be shared across targets and schemes.',
    usedFor: [{ label: 'Xcode', description: 'Configure iOS/macOS build settings like Swift version, deployment targets, and compiler flags', href: 'https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project' }],
  },
};
