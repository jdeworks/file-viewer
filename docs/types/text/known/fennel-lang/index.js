export const plugin = {
  id: 'fennel-lang',
  label: 'Fennel Script',
  tags: ['fennel', 'lua', 'lisp', 'fnl'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.fnl')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('(fn') && !text.includes('(local') && !text.includes('(require')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fennel is a programming language that runs on the Lua runtime. It combines the simplicity and speed of Lua with the power of a Lisp macro system.',
    usedFor: [
      { label: 'fennel-lang.org', description: 'Official Fennel language home', href: 'https://fennel-lang.org/' },
      { label: 'Fennel on GitHub', description: 'Fennel source repository', href: 'https://github.com/bakpakin/Fennel' },
    ],
  },
};
export default plugin;
