export const plugin = {
  id: 'tla-plus',
  label: 'TLA+',
  tags: ['tla+', 'formal-methods', 'specification', 'verification'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.tla')) return false;
    const text = intake.text || '';
    // Must have the TLA+ module header+footer OR structural keywords
    return /----\s*MODULE\s+\w+/.test(text) ||
      /====/.test(text) ||
      /\bVARIABLES\b/.test(text) ||
      /\bCONSTANTS\b/.test(text) ||
      /\\E\b/.test(text) ||
      /\\A\b/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'TLA+ specification — a formal specification language for describing and verifying concurrent and distributed systems.',
    usedFor: [
      { label: 'TLA+ documentation', description: 'Official TLA+ documentation and tutorials by Leslie Lamport', href: 'https://lamport.azurewebsites.net/tla/tla.html' },
      { label: 'TLA+ tools', description: 'TLC model checker and other TLA+ tools', href: 'https://github.com/tlaplus/tlaplus' },
    ],
  },
};
export default plugin;
