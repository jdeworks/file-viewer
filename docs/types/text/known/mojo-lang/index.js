export const plugin = {
  id: 'mojo-lang',
  label: 'Mojo',
  tags: ['mojo', 'python', 'ai', 'ml', 'systems'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.mojo') || name.endsWith('.🔥')) return true;
    const text = intake.text || '';
    const head = text.slice(0, 2000);
    if (!head.includes('fn ') && !head.includes('struct ') && !head.includes('from ')) return null;
    const hits = [
      /^\s*fn\s+\w+/m.test(text),
      /^\s*struct\s+\w+/m.test(text),
      /^\s*from\s+\w+\s+import\b/m.test(text),
      /\balias\s+\w+/.test(text),
      /\b@value\b/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Mojo is a programming language that is a superset of Python, designed for AI/ML workloads with systems-level performance. .mojo files are source modules featuring structs, typed functions, and Python interop.',
    usedFor: [
      { label: 'docs.modular.com', description: 'Official Mojo language documentation', href: 'https://docs.modular.com/mojo/' },
      { label: 'Modular Platform', description: 'Modular AI development platform', href: 'https://www.modular.com/' },
    ],
  },
};
export default plugin;
