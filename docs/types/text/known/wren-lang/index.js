export const plugin = {
  id: 'wren-lang',
  label: 'Wren Script',
  tags: ['wren', 'scripting', 'embedded', 'class-based'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.wren')) return true;
    const text = intake.text || '';
    const head = text.slice(0, 2000);
    if (!head.includes('class ') && !head.includes('import ') && !head.includes('construct ')) return null;
    const hits = [
      /^import\s+"/m.test(text),
      /^\s*class\s+\w+/m.test(text),
      /\bconstruct\s+\w+\s*\(/.test(text),
      /\bSystem\.print\b/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Wren is a small, fast, class-based scripting language designed to be easily embedded in applications. .wren files are source scripts featuring classes with constructors, methods, and static members.',
    usedFor: [
      { label: 'wren.io', description: 'Official Wren language home', href: 'https://wren.io/' },
      { label: 'Wren Cookbook', description: 'Practical Wren examples', href: 'https://wren.io/cookbook/' },
    ],
  },
};
export default plugin;
