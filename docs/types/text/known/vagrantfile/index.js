export const plugin = {
  id: 'vagrantfile',
  label: 'Vagrantfile',
  tags: ['vagrant', 'hashicorp', 'vm', 'virtualbox'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'vagrantfile';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vagrant VM configuration (Ruby DSL) — defines base box, networking, shared folders, and provisioners.',
    usedFor: [{ label: 'Vagrant', description: 'Development environment automation with VMs', href: 'https://developer.hashicorp.com/vagrant/docs/vagrantfile' }],
  },
};
export default plugin;
