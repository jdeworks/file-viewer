export const plugin = {
  id: 'kotlin-lang',
  label: 'Kotlin',
  tags: ['kotlin', 'kt', 'kts', 'jvm', 'android'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.kt') || name.endsWith('.kts')) return true;
    const text = intake.text || '';
    const hits = [
      /^\s*package\s+[\w.]+/m.test(text),
      /^\s*fun\s+\w+/m.test(text),
      /\bdata\s+class\s+\w+/.test(text),
      /\bsealed\s+class\s+\w+/.test(text),
      /\bobject\s+\w+/.test(text),
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kotlin is a statically typed programming language for the JVM, Android, and multiplatform targets. .kt files are regular source; .kts files are Kotlin Scripts.',
    usedFor: [
      { label: 'kotlinlang.org', description: 'Official Kotlin language home', href: 'https://kotlinlang.org/' },
      { label: 'Android + Kotlin', description: 'Official Android development with Kotlin', href: 'https://developer.android.com/kotlin' },
    ],
  },
};
export default plugin;
