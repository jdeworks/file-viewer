export const plugin = {
  id: 'sml-lang',
  label: 'Standard ML',
  tags: ['sml', 'functional', 'statically-typed', 'ml'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.sml') || name.endsWith('.fun')) return true;
    if (name.endsWith('.sig')) {
      // .sig overlaps with PEM signatures — require SML content keywords
      const text = intake.text || '';
      return /\b(?:structure|signature|functor|val\s+\w|fun\s+\w)\b/.test(text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Standard ML source file — a statically typed functional programming language with a formal definition and module system.',
    usedFor: [
      { label: 'Standard ML of New Jersey', description: 'SML/NJ compiler and documentation', href: 'https://www.smlnj.org/' },
      { label: 'Programming in Standard ML', description: 'Comprehensive SML textbook by Robert Harper', href: 'http://www.cs.cmu.edu/~rwh/isml/book.pdf' },
    ],
  },
};
export default plugin;
