export default {
  id: 'fastfile',
  label: 'Fastfile',
  match: (intake) => (intake.filename || '').split('/').pop() === 'Fastfile',
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fastlane Fastfile — defines lanes (CI/CD workflows) for automating iOS/Android builds, tests, and deployments.',
    usedFor: [
      { label: 'CI automation', description: 'Automates building, testing, and releasing mobile apps', href: 'https://docs.fastlane.tools/advanced/Fastfile/' },
    ],
  },
};
