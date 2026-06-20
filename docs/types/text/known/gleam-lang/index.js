export const plugin = {
  id: 'gleam-lang',
  label: 'Gleam',
  tags: ['gleam', 'functional', 'erlang', 'beam'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.gleam')) return true;
    const text = intake.text || '';
    const hits = [
      /^import\s+/m.test(text),
      /^pub\s+fn\s+\w+/m.test(text),
      /^type\s+\w+/m.test(text),
      /^pub\s+type\s+\w+/m.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Gleam is a friendly functional programming language that compiles to Erlang and JavaScript. .gleam files are source modules featuring strong static typing and pattern matching.',
    usedFor: [
      { label: 'gleam.run', description: 'Official Gleam language home', href: 'https://gleam.run/' },
      { label: 'Gleam Tour', description: 'Interactive language tour', href: 'https://tour.gleam.run/' },
    ],
  },
};
export default plugin;
