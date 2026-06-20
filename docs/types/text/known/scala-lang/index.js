export const plugin = {
  id: 'scala-lang',
  label: 'Scala',
  tags: ['scala', 'sc', 'jvm', 'functional', 'ammonite'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.scala') || name.endsWith('.sc')) return true;
    const text = intake.text || '';
    const hits = [
      /^\s*object\s+\w+/.test(text),
      /^\s*class\s+\w+/.test(text),
      /^\s*trait\s+\w+/.test(text),
      /^\s*def\s+\w+/.test(text),
      /^\s*val\s+\w+/.test(text),
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Scala is a strong statically typed high-level general-purpose programming language that supports both object-oriented programming and functional programming. .scala files are regular source; .sc files are Ammonite scripts.',
    usedFor: [
      { label: 'scala-lang.org', description: 'Official Scala language home', href: 'https://www.scala-lang.org/' },
      { label: 'Ammonite', description: 'Ammonite Scala REPL and scripts', href: 'https://ammonite.io/' },
    ],
  },
};
export default plugin;
