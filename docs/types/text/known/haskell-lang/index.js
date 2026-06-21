export const plugin = {
  id: 'haskell-lang',
  label: 'Haskell',
  tags: ['haskell', 'hs', 'lhs', 'functional', 'ml'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.hs') || name.endsWith('.lhs')) return true;
    // The content heuristic (module/import/data/type) appears in many functional languages
    // (Julia, PureScript, etc.). Only content-match files with no/unknown extension.
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext && ext !== 'hs' && ext !== 'lhs') return false;
    const text = intake.text || '';
    // Boost: multiple Haskell-specific keywords give high confidence
    const hits = [/\bmodule\s+[A-Z]/.test(text), /\bimport\s+(qualified\s+)?[A-Z]/.test(text), /\bdata\s+[A-Z]/.test(text), /\btype\s+[A-Z]/.test(text), /\bnewtype\s+[A-Z]/.test(text), /\bclass\s+[A-Z]/.test(text), /\binstance\s+/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Haskell is a purely functional programming language with static typing and lazy evaluation. .hs files are regular source; .lhs (literate Haskell) interleaves prose and code, with code lines prefixed by >.',
    usedFor: [
      { label: 'Haskell.org', description: 'Official Haskell language home', href: 'https://www.haskell.org/' },
      { label: 'GHC User Guide', description: 'Glasgow Haskell Compiler documentation', href: 'https://downloads.haskell.org/ghc/latest/docs/users_guide/' },
    ],
  },
};
export default plugin;
