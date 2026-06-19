export default {
  id: 'vagrantfile',
  label: 'Vagrantfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'Vagrantfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vagrant VM configuration (Ruby DSL) — defines base box, networking, shared folders, and provisioners.',
    usedFor: [{ label: 'Vagrant', description: 'Development environment automation with VMs', href: 'https://developer.hashicorp.com/vagrant/docs/vagrantfile' }],
  },
};
