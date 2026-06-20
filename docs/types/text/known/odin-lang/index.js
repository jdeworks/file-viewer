export const plugin = {
  id: 'odin-lang',
  label: 'Odin',
  tags: ['odin', 'systems', 'native', 'c-alternative'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.odin')) return true;
    const text = intake.text || '';
    const hits = [
      /^package\s+\w+/m.test(text),
      /^import\s+/m.test(text),
      /\bproc\s+\w+/m.test(text),
      /\bstruct\s*\{/.test(text),
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Odin is a general-purpose, systems programming language built with the intent of creating an alternative to C. .odin files are source files using packages as the organisational unit.',
    usedFor: [
      { label: 'odin-lang.org', description: 'Official Odin language home', href: 'https://odin-lang.org/' },
      { label: 'Odin Overview', description: 'Language overview and documentation', href: 'https://odin-lang.org/docs/overview/' },
    ],
  },
};
export default plugin;
