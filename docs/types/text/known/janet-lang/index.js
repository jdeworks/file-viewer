export const plugin = {
  id: 'janet-lang',
  label: 'Janet Script',
  tags: ['janet', 'lisp', 'scripting', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.janet')) return true;
    const text = intake.text || '';
    const head = text.slice(0, 2000);
    if (!head.includes('(defn') && !head.includes('(def')) return null;
    const hits = [
      /\(defn\s+\w+/.test(text),
      /\(def\s+\w+/.test(text),
      /\(import\s+/.test(text),
      /\(defmacro\s+\w+/.test(text),
      /\(module\s+/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Janet is a functional and imperative programming language and bytecode interpreter. It is a modern Lisp with macros, closures, and a rich standard library. .janet files are source modules.',
    usedFor: [
      { label: 'janet-lang.org', description: 'Official Janet language home', href: 'https://janet-lang.org/' },
      { label: 'Janet API Docs', description: 'Janet standard library documentation', href: 'https://janet-lang.org/api/index.html' },
    ],
  },
};
export default plugin;
