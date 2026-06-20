export const plugin = {
  id: 'purescript-lang',
  label: 'PureScript',
  tags: ['purescript', 'purs', 'functional', 'haskell', 'javascript'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.purs')) return false;
    const text = intake.text || '';
    const hits = [
      /^module\s+[A-Z]/m.test(text),
      /^import\s+[A-Z]/m.test(text),
      /^\s*type\s+\w/m.test(text),
      /^\s*data\s+\w/m.test(text),
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PureScript is a strongly-typed, purely functional programming language that compiles to JavaScript. It is inspired by Haskell but designed specifically for web development.',
    usedFor: [
      { label: 'purescript.org', description: 'Official PureScript language home', href: 'https://www.purescript.org/' },
      { label: 'Pursuit', description: 'PureScript package search', href: 'https://pursuit.purescript.org/' },
    ],
  },
};
export default plugin;
