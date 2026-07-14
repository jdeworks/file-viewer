export const plugin = {
  id: 'odin-lang',
  label: 'Odin',
  tags: ['odin', 'systems', 'native', 'c-alternative'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.odin');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Odin is a general-purpose, systems programming language built with the intent of creating an alternative to C. .odin files are source files using packages as the organisational unit.',
    usedFor: [
      { label: 'odin-lang.org', description: 'Official Odin language home', href: 'https://odin-lang.org/' },
      { label: 'Odin Overview', description: 'Language overview and documentation', href: 'https://odin-lang.org/docs/overview/' },
    ],
  },
};
export default plugin;
