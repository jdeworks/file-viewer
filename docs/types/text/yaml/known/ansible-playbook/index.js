export default {
  id: 'ansible-playbook',
  label: 'Ansible playbook',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    const knownNames = new Set(['playbook.yml', 'playbook.yaml', 'site.yml', 'site.yaml', 'main.yml', 'main.yaml']);
    if (!knownNames.has(name) && !name.includes('ansible')) return false;
    const text = intake.textSample || intake.text || '';
    // Must have hosts key at top level or as list element
    return /^\s*-?\s*hosts\s*:/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ansible playbook — shows plays, hosts, and task list.',
    usedFor: [{ label: 'IT automation', description: 'Define Ansible plays targeting hosts with ordered task lists.', href: 'https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html' }],
  },
};
