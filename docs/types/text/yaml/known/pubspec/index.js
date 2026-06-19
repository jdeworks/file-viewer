export default {
  id: 'pubspec',
  label: 'Flutter / Dart pubspec',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    if (name !== 'pubspec.yaml' && name !== 'pubspec.yml') return false;
    const t = intake.text || '';
    return /\bdart\b|\bflutter\b/i.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Flutter and Dart package manifest — defines the package name, SDK constraints, and dependencies.',
    usedFor: [
      { label: 'Flutter apps', description: 'Mobile/web/desktop apps built with Flutter' },
      { label: 'Dart packages', description: 'Pure Dart libraries and CLI tools' },
    ],
  },
};
