export default {
  id: 'ansible-cfg',
  label: 'Ansible Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'ansible.cfg') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('[defaults]') && (text.includes('inventory') || text.includes('remote_user'))) return true;
    if (text.includes('[privilege_escalation]') && text.includes('become')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ansible automation configuration — inventory, connection, privilege escalation, and plugin settings.',
    tags: ['ansible', 'devops', 'automation', 'config'],
  },
};
