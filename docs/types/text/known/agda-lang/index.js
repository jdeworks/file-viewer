export const plugin = {
  id: 'agda-lang',
  label: 'Agda',
  tags: ['agda', 'dependent-types', 'theorem-prover', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.agda') || name.endsWith('.lagda')) return true;
    // The content heuristic (module/import/data/record/where) appears in many functional
    // languages. Only content-match files with no/unknown extension (a bare extension guard).
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext && ext !== 'agda' && ext !== 'lagda') return false;
    const text = intake.text || '';
    const hits = [/^module\s+\S+\s+where/m.test(text), /^import\s+/m.test(text), /^data\s+\S+/m.test(text), /^record\s+\S+/m.test(text), /^postulate\b/m.test(text), /\bwhere\b/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Agda is a dependently typed functional programming language and proof assistant. It is used for writing formally verified programs and mathematical proofs.',
    usedFor: [
      { label: 'Agda documentation', description: 'Official Agda language reference', href: 'https://agda.readthedocs.io/' },
      { label: 'Agda Standard Library', description: 'Agda standard library documentation', href: 'https://agda.github.io/agda-stdlib/' },
    ],
  },
};
export default plugin;
