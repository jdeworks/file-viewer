export default {
  id: 'ansible-cfg',
  label: 'ansible.cfg',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'ansible.cfg' || name === '.ansible.cfg';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ansible configuration file — controls inventory paths, remote user, privilege escalation, and plugin settings.',
    usedFor: [{ label: 'Ansible', description: 'IT automation and configuration management', href: 'https://docs.ansible.com/ansible/latest/reference_appendices/config.html' }],
  },
};
