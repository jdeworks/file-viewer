export default {
  id: 'ansible-requirements',
  label: 'Ansible Requirements',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    if (name !== 'requirements.yml' && name !== 'requirements.yaml') return false;
    const t = intake.textSample || intake.text || '';
    return t.includes('roles:') || t.includes('collections:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ansible Galaxy requirements — lists roles and collections to install.',
    usedFor: [{ label: 'Galaxy dependencies', description: 'Specify Ansible Galaxy roles and collections required by your project.', href: 'https://docs.ansible.com/ansible/latest/galaxy/user_guide.html' }],
  },
};
