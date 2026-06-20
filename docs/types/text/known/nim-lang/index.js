export const plugin = {
  id: 'nim-lang',
  label: 'Nim',
  tags: ['nim', 'systems', 'compiled'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // .nimble is handled by a separate plugin — do NOT match it here
    if (name.endsWith('.nimble')) return null;
    if (!name.endsWith('.nim')) return false;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nim is a statically typed compiled systems programming language. .nim source files define modules that can be imported or run directly.',
    usedFor: [
      { label: 'nim-lang.org', description: 'Official Nim language home', href: 'https://nim-lang.org/' },
      { label: 'Nimble packages', description: 'Nim package directory', href: 'https://nimble.directory/' },
    ],
  },
};
export default plugin;
