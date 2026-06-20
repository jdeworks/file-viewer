export const plugin = {
  id: 'dart-lang',
  label: 'Dart',
  tags: ['dart', 'flutter', 'mobile', 'web'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (!name.endsWith('.dart')) return false;
    const text = intake.text || '';
    // Boost: at least one typical Dart marker
    if (/void\s+main\s*\(/.test(text)) return true;
    if (/import\s+'package:/.test(text)) return true;
    if (/^\s*class\s+\w+/m.test(text)) return true;
    if (/void\s+main\s*\(\s*\)\s*async/.test(text)) return true;
    return true; // extension .dart alone is reliable enough
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dart is a client-optimized programming language for fast apps on any platform, developed by Google. Used extensively with Flutter for mobile and web development.',
    usedFor: [
      { label: 'dart.dev', description: 'Official Dart language home', href: 'https://dart.dev/' },
      { label: 'flutter.dev', description: 'Flutter framework built on Dart', href: 'https://flutter.dev/' },
    ],
  },
};
export default plugin;
