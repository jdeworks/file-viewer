export const plugin = {
  id: 'elm-lang',
  label: 'Elm',
  tags: ['elm', 'functional', 'frontend', 'tea'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (!name.endsWith('.elm')) return false;
    // Boost confidence: at least one Elm-specific pattern
    const text = intake.text || '';
    if (/^module\s+/m.test(text) || /^import\s+/m.test(text) || /^type\s+/m.test(text) || /^type\s+alias\s+/m.test(text)) {
      return true;
    }
    // Still match .elm even without keyword matches
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elm is a purely functional language for building web UIs. It compiles to JavaScript and enforces The Elm Architecture (TEA) pattern of Model/Update/View. .elm files are Elm source modules.',
    usedFor: [
      { label: 'Elm-lang.org', description: 'Official Elm language home', href: 'https://elm-lang.org/' },
      { label: 'Elm Guide', description: 'An Introduction to Elm', href: 'https://guide.elm-lang.org/' },
    ],
  },
};
export default plugin;
