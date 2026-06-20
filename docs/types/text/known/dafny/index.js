export const plugin = {
  id: 'dafny',
  label: 'Dafny',
  tags: ['dafny', 'verification', 'formal', 'specification'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.dfy')) return true;
    const text = intake.text || '';
    const keywords = ['method ', 'function ', 'predicate ', 'class ', 'ensures ', 'requires ', 'modifies ', 'invariant '];
    const hits = keywords.filter((kw) => text.includes(kw)).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dafny verification-aware programming language — supports formal specification with preconditions, postconditions, and loop invariants.',
    usedFor: [
      { label: 'Dafny Language Reference', description: 'Official Dafny language reference manual', href: 'https://dafny.org/dafny/DafnyRef/DafnyRef' },
      { label: 'Dafny Project', description: 'Dafny programming language project site', href: 'https://dafny.org/' },
    ],
  },
};
export default plugin;
