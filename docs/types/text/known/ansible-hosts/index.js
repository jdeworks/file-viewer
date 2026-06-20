export default {
  id: 'ansible-hosts',
  label: 'Ansible Inventory',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Named hosts or inventory, with ansible group syntax
    if (n === 'hosts' && (text.includes('[') || text.includes('ansible_host'))) return true;
    if (n === 'inventory' && text.includes('ansible_host')) return true;
    if ((n === 'hosts.ini' || n === 'inventory.ini') && text.includes('[')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ansible inventory file — defines hosts and groups for playbook targeting.',
    usedFor: [{ label: 'Ansible', description: 'IT automation inventory', href: 'https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html' }],
  },
};
