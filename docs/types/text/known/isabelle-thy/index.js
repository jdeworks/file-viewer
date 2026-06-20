export const plugin = {
  id: 'isabelle-thy',
  label: 'Isabelle/HOL',
  tags: ['isabelle', 'hol', 'theorem-prover', 'formal-methods', 'proof'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.thy')) return false;
    const text = intake.text || '';
    return /\btheory\s+\w/.test(text) && /\bbegin\b/.test(text) && /\bend\b/.test(text) &&
      /\b(lemma|theorem|proof|qed|by\s|fixes|assumes|shows)\b/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Isabelle/HOL theory file — a proof document for the Isabelle interactive theorem prover, containing definitions, lemmas, theorems, and their machine-checked proofs.',
    usedFor: [
      { label: 'Isabelle documentation', description: 'Official Isabelle theorem prover documentation', href: 'https://isabelle.in.tum.de/documentation.html' },
      { label: 'Archive of Formal Proofs', description: 'Collection of peer-reviewed Isabelle theories', href: 'https://www.isa-afp.org/' },
    ],
  },
};
export default plugin;
