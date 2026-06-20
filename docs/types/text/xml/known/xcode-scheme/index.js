export default {
  id: 'xcode-scheme',
  label: 'Xcode Scheme',
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== 'xml') return false;
    const name = (intake.filename || '').split('/').pop();
    return name.endsWith('.xcscheme');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Xcode scheme file — defines how Xcode builds, runs, tests, profiles, and archives a target.',
    usedFor: [
      { label: 'iOS/macOS apps', description: 'Controls build configurations and test settings for Xcode targets' },
    ],
  },
};
