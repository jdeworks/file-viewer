// Verilog also uses .v — reject files that have Verilog keywords
function hasVerilogKeywords(text) {
  return /\b(endmodule|always\s*@|wire\s+|assign\s+)\b/.test(text || '');
}

function hasCoqSignals(text) {
  if (!text) return false;
  // Strong Coq signals (must have at least one)
  return /\bInductive\s+/.test(text) ||
    (/\bTheorem\s+/.test(text) && /\bProof\b/.test(text)) ||
    /\bFixpoint\s+/.test(text) ||
    (/\bLemma\s+/.test(text) && /\bQed\./.test(text));
}

export const plugin = {
  id: 'coq-lang',
  label: 'Coq',
  tags: ['coq', 'theorem-prover', 'formal-methods', 'proof-assistant', 'dependent-types'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'coq') return true;
    if (ext !== 'v') return false;
    const text = intake.text || '';
    if (hasVerilogKeywords(text)) return false;
    return hasCoqSignals(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Coq proof assistant source file — a formal proof management system supporting dependent type theory, used for verified software, mathematics, and certified compilation.',
    usedFor: [
      { label: 'Coq documentation', description: 'Official Coq proof assistant documentation', href: 'https://coq.inria.fr/documentation' },
      { label: 'Software Foundations', description: 'Classic Coq-based textbook series on formal verification', href: 'https://softwarefoundations.cis.upenn.edu/' },
    ],
  },
};
export default plugin;
