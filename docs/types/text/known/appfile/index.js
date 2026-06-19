export default {
  id: 'appfile',
  label: 'Appfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'Appfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fastlane Appfile — stores app configuration (bundle ID, Apple ID, team info) shared across all Fastlane tools and lanes.',
    usedFor: [
      { label: 'Fastlane config', description: 'Centralises Apple credentials and app identifiers for Fastlane automation', href: 'https://docs.fastlane.tools/advanced/Appfile/' },
    ],
  },
};
