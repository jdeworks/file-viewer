export default {
  id: 'eas-json',
  label: 'eas.json (Expo EAS)',
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop();
    return name === 'eas.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Expo Application Services build/submit configuration — defines build profiles for development, preview, and production.',
    usedFor: [
      { label: 'Expo apps', description: 'Configures EAS Build for iOS and Android cloud builds' },
      { label: 'React Native apps', description: 'Manages submit profiles for App Store and Google Play' },
    ],
  },
};
