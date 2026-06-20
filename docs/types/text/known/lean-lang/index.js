export const plugin = {
  id: 'lean-lang',
  label: 'Lean 4',
  tags: ['lean', 'lean4', 'theorem-prover', 'dependent-types', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.lean')) return true;
    const text = intake.text || '';
    const hits = [/\btheorem\s+/.test(text), /\blemma\s+/.test(text), /\bimport\s+/.test(text), /\bnamespace\s+/.test(text), /\bopen\s+/.test(text), /\bdef\s+/.test(text), /#check\b/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Lean 4 is a functional programming language and interactive theorem prover developed at Microsoft Research. It is used to write formally verified mathematics and software.',
    usedFor: [
      { label: 'Lean 4 documentation', description: 'Official Lean 4 programming language reference', href: 'https://lean-lang.org/' },
      { label: 'Mathlib4', description: 'Mathematical library for Lean 4', href: 'https://leanprover-community.github.io/mathlib4_docs/' },
    ],
  },
};
export default plugin;
