export default {
  id: 'proguard-rules',
  label: 'ProGuard Rules',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'proguard-rules.pro' || n === 'consumer-rules.pro' || n === 'proguard-rules.txt';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Android ProGuard/R8 obfuscation rules — controls which classes and members are kept, shrunk, or obfuscated during the build.',
    usedFor: [
      { label: 'ProGuard', description: 'Code shrinking, obfuscation, and optimization rules for Android apps', href: 'https://developer.android.com/build/shrink-code' },
    ],
  },
};
