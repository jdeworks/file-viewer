export const plugin = {
  id: 'jinja2-template',
  label: 'Jinja2 Template',
  tags: ['jinja2', 'jinja', 'ansible', 'python', 'template'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.j2') || name.endsWith('.jinja') || name.endsWith('.jinja2')) return true;
    // The content heuristic ({{ }}/{% %}/{# #}) also matches .njk (Nunjucks) and other template
    // files with dedicated plugins. Only content-match files with no/unknown extension.
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext && ext !== 'j2' && ext !== 'jinja' && ext !== 'jinja2') return false;
    // Content-based: needs at least 2 different tag types to avoid false positives
    const text = intake.text || '';
    const hasOutput = /\{\{\s/.test(text);
    const hasBlock = /\{%\s/.test(text);
    const hasComment = /\{#\s/.test(text);
    const tagTypeCount = [hasOutput, hasBlock, hasComment].filter(Boolean).length;
    return tagTypeCount >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jinja2 is a Python templating engine used in Flask, Ansible, SaltStack, and Kubernetes tooling. It supports template inheritance via {% extends %}, macros, filters, and control flow.',
    usedFor: [
      { label: 'Jinja2 docs', description: 'Official Jinja2 templating engine documentation', href: 'https://jinja.palletsprojects.com/' },
      { label: 'Ansible templating', description: 'Ansible uses Jinja2 for variable substitution and templates', href: 'https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating.html' },
    ],
  },
};
export default plugin;
