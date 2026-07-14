export const plugin = {
  id: 'gleam-lang',
  label: 'Gleam',
  tags: ['gleam', 'functional', 'erlang', 'beam'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.gleam');
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
