export const plugin = {
  id: 'alloy-lang',
  label: 'Alloy',
  tags: ['alloy', 'formal-methods', 'specification', 'model-checking', 'relational-logic'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.als')) return false;
    const text = intake.text || '';
    return /\b(module|sig\s|pred\s|fact\s|assert\s|check\s|run\s)\b/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Alloy formal specification file — a declarative language based on relational logic for modeling and analyzing software designs and protocols.',
    usedFor: [
      { label: 'Alloy documentation', description: 'Official Alloy language documentation and tutorial', href: 'https://alloytools.org/documentation.html' },
      { label: 'Alloy Analyzer', description: 'The Alloy model checking tool', href: 'https://alloytools.org/' },
    ],
  },
};
export default plugin;
