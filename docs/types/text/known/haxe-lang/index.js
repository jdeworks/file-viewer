export const plugin = {
  id: 'haxe-lang',
  label: 'Haxe',
  tags: ['haxe', 'hx', 'multi-target', 'cross-platform'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.hx')) {
      // Content guard: must have at least one of these in first 2000 chars
      const preview = (intake.text || '').slice(0, 2000);
      if (!preview.includes('class ') && !preview.includes('import ') && !preview.includes('package ')) return false;
      return true;
    }
    const text = intake.text || '';
    const hits = [
      /^class\s+\w+/m.test(text),
      /^import\s+[\w.]+/m.test(text),
      /^package\s+[\w.]+/m.test(text),
      /^function\s+\w+/m.test(text),
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Haxe is an open-source high-level strictly-typed programming language that can compile to multiple targets including JavaScript, C++, Java, Python, and more. .hx files are Haxe source files.',
    usedFor: [
      { label: 'haxe.org', description: 'Official Haxe language home', href: 'https://haxe.org/' },
      { label: 'Haxe Manual', description: 'Official Haxe manual', href: 'https://haxe.org/manual/' },
    ],
  },
};
export default plugin;
