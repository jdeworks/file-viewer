// PROMELA model checking language for SPIN (.pml, .promela, .prm)
const PROMELA_KEYWORDS = ['proctype ', 'init {', 'chan ', 'atomic {', ':: ', 'do ::', 'if ::'];

function looksLikePromela(text) {
  let hits = 0;
  for (const kw of PROMELA_KEYWORDS) {
    if (text.includes(kw)) hits++;
  }
  return hits >= 2;
}

export default {
  id: 'promela',
  label: 'PROMELA',
  tags: ['promela', 'spin', 'model-checking', 'formal-verification', 'concurrency'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.pml') && !name.endsWith('.promela') && !name.endsWith('.prm')) return false;
    const text = intake.textSample || intake.text || '';
    return looksLikePromela(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PROMELA (Process Meta Language) model file — the input language for the SPIN model checker, used for formal verification of concurrent systems.',
    usedFor: [
      { label: 'SPIN model checker', description: 'Official SPIN model checker documentation', href: 'https://spinroot.com/' },
      { label: 'PROMELA reference', description: 'PROMELA language reference', href: 'https://spinroot.com/spin/Man/Manual.html' },
    ],
  },
};
