export const plugin = {
  id: 'crystal-lang',
  label: 'Crystal',
  tags: ['crystal', 'cr', 'ruby-like', 'systems'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.cr')) return false;
    const text = intake.text || '';
    // Guard: if file has C-header markers, don't claim it
    if (/^#include\b/m.test(text) || /^typedef\b/m.test(text)) return false;
    // Content boost
    const hits = [
      /^def\s+/m.test(text),
      /^class\s+/m.test(text),
      /^module\s+/m.test(text),
      /^require\s+/m.test(text),
      /^struct\s+/m.test(text),
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Crystal is a statically typed, compiled language with Ruby-like syntax, native performance, and built-in concurrency via fibers. .cr files are Crystal source files.',
    usedFor: [
      { label: 'crystal-lang.org', description: 'Official Crystal language home', href: 'https://crystal-lang.org/' },
      { label: 'Crystal API docs', description: 'Standard library documentation', href: 'https://crystal-lang.org/api/' },
    ],
  },
};
export default plugin;
