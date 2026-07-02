export const plugin = {
  id: 'dafny',
  label: 'Dafny',
  tags: ['dafny', 'verification', 'formal', 'specification'],
  match(intake, baseType) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.dfy')) return true;
    if (baseType?.id === 'markdown') return false;
    const text = intake.text || '';
    const decls = ['method ', 'function ', 'predicate ', 'class '].filter((kw) => text.includes(kw)).length;
    const specs = ['ensures ', 'requires ', 'modifies ', 'invariant '].filter((kw) => text.includes(kw)).length;
    return decls >= 1 && specs >= 1 && decls + specs >= 3;
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
