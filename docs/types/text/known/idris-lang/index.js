export const plugin = {
  id: 'idris-lang',
  label: 'Idris',
  tags: ['idris', 'functional', 'dependent-types', 'total'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.idr') || name.endsWith('.idr2')) return true;
    const text = intake.text || '';
    return /^module\s+\w/m.test(text) && (/^import\s+/m.test(text) || /^data\s+/m.test(text) || /:\s*Type\b/.test(text) || /\btotal\b/.test(text) || /\bpartial\b/.test(text));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Idris source file — a purely functional programming language with dependent types and optional totality checking.',
    usedFor: [
      { label: 'Idris documentation', description: 'Official Idris 2 documentation and tutorials', href: 'https://idris2.readthedocs.io/' },
      { label: 'Type-Driven Development with Idris', description: 'Book on type-driven development in Idris', href: 'https://www.manning.com/books/type-driven-development-with-idris' },
    ],
  },
};
export default plugin;
