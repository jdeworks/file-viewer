export default {
  id: 'google-services',
  label: 'Google Services (Firebase)',
  match: (intake, baseType) => {
    if (baseType?.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'google-services.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Firebase/Google Services configuration for Android — project info, API keys, OAuth clients, and Firebase sender IDs.',
    usedFor: [{ label: 'Firebase Android', description: 'Connect Android app to Firebase and Google APIs', href: 'https://firebase.google.com/docs/android/setup' }],
  },
};
