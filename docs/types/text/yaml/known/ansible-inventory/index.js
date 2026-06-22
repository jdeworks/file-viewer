export default {
  id: 'ansible-inventory',
  label: 'Ansible Inventory',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'inventory.yml' || name === 'inventory.yaml' || name === 'hosts.yml' || name === 'hosts.yaml') return true;
    const t = intake.textSample || intake.text || '';
    return /\bhosts\s*:/.test(t) && /\bansible_host\s*:/.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ansible inventory — shows host groups, hosts, and variables.',
    usedFor: [{ label: 'Infrastructure inventory', description: 'Define Ansible host groups and variables.', href: 'https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html' }],
  },
};
