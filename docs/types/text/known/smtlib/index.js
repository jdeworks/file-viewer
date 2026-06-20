// SMT-LIB 2 solver input format (.smt2, .smt)
const SMT_KEYWORDS = ['(set-logic ', '(declare-fun ', '(assert ', '(check-sat', '(get-model'];

function looksLikeSmtLib(text) {
  let hits = 0;
  for (const kw of SMT_KEYWORDS) {
    if (text.includes(kw)) hits++;
  }
  return hits >= 2;
}

export default {
  id: 'smtlib',
  label: 'SMT-LIB 2',
  tags: ['smt', 'smt-lib', 'formal-verification', 'solver', 'logic'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.smt2') && !name.endsWith('.smt')) return false;
    const text = intake.textSample || intake.text || '';
    return looksLikeSmtLib(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SMT-LIB 2 input file — a standard format for Satisfiability Modulo Theories (SMT) solvers such as Z3, CVC5, and Yices.',
    usedFor: [
      { label: 'SMT-LIB standard', description: 'The SMT-LIB standard website', href: 'https://smtlib.cs.uiowa.edu/' },
      { label: 'Z3 SMT solver', description: 'Z3 theorem prover by Microsoft Research', href: 'https://github.com/Z3Prover/z3' },
    ],
  },
};
