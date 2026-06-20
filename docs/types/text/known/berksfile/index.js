export const plugin = {
  id: 'berksfile',
  label: 'Berksfile',
  tags: ['berkshelf', 'chef', 'cookbook', 'ruby'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'berksfile';
  },
  renderer: () => import('./renderer.js'),
  about: {
    description: 'Berkshelf Berksfile — Chef cookbook dependency manager that declares cookbook sources and version constraints.',
    usedFor: [{ label: 'Berkshelf', description: 'Chef cookbook dependency management', href: 'https://docs.chef.io/workstation/berkshelf/' }],
  },
};
export default plugin;
