export const plugin = {
  id: 'swift-lang',
  label: 'Swift',
  tags: ['swift', 'ios', 'macos', 'apple', 'swiftui'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop();
    const lower = name.toLowerCase();
    // Don't match Package.swift — handled by package-swift plugin
    if (lower === 'package.swift') return null;
    if (!lower.endsWith('.swift')) return false;
    const text = intake.text || '';
    const hits = [
      /\bimport\s+\w+/.test(text),
      /\bclass\s+\w+/.test(text),
      /\bstruct\s+\w+/.test(text),
      /\bfunc\s+\w+/.test(text),
      /\bprotocol\s+\w+/.test(text),
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Swift is a general-purpose, compiled programming language developed by Apple. It is used for iOS, macOS, watchOS, tvOS, and server-side development.',
    usedFor: [
      { label: 'swift.org', description: 'Official Swift language home', href: 'https://swift.org/' },
      { label: 'Apple Developer', description: 'Apple developer documentation', href: 'https://developer.apple.com/swift/' },
    ],
  },
};
export default plugin;
