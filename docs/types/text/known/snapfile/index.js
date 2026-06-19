export default {
  id: 'snapfile',
  label: 'Snapfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'Snapfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fastlane Snapshot Snapfile — configures automated screenshot capture for iOS apps across devices and locales.',
    usedFor: [{ label: 'Fastlane Snapshot', description: 'Automate app screenshots for the App Store', href: 'https://docs.fastlane.tools/actions/snapshot/' }],
  },
};
