export default {
  id: 'android-manifest',
  label: 'Android Manifest',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'androidmanifest.xml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Android app manifest — declares the app package, version, permissions, and components (activities, services, receivers, providers).',
    usedFor: [{ label: 'Android', description: 'Required configuration file for every Android application', href: 'https://developer.android.com/guide/topics/manifest/manifest-intro' }],
  },
};
