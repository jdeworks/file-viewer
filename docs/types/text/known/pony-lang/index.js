export const plugin = {
  id: 'pony-lang',
  label: 'Pony',
  tags: ['pony', 'actor', 'concurrent', 'capability'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.pony')) return true;
    const text = intake.text || '';
    const head = text.slice(0, 2000);
    const boosts = [
      head.includes('actor '),
      head.includes('class '),
      head.includes('primitive '),
      head.includes('interface '),
      head.includes('trait '),
    ].filter(Boolean).length;
    if (boosts < 2) return false;
    const hits = [
      /^\s*actor\s+\w+/m.test(text),
      /^\s*class\s+\w+/m.test(text),
      /^\s*fun\s+\w+/m.test(text),
      /^\s*be\s+\w+/m.test(text),
      /^\s*primitive\s+\w+/m.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pony is an open-source, object-oriented, actor-model, capabilities-secure, high-performance programming language. .pony files are source modules featuring actors, classes, primitives, and capability types.',
    usedFor: [
      { label: 'ponylang.io', description: 'Official Pony language home', href: 'https://www.ponylang.io/' },
      { label: 'Pony Tutorial', description: 'Official Pony language tutorial', href: 'https://tutorial.ponylang.io/' },
    ],
  },
};
export default plugin;
