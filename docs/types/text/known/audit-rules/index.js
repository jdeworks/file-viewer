export const plugin = {
  id: 'audit-rules',
  label: 'Audit Rules',
  tags: ['audit', 'linux', 'security', 'auditd', 'syscall'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop();
    const path = intake.name || intake.filename || '';
    if (name === 'audit.rules') return true;
    if (name.endsWith('.rules') && path.includes('audit')) return true;
    // Content-based detection
    const sample = intake.textSample || intake.text || '';
    return /^(-a always,exit|-A always,exit|-w |-b |-D )/m.test(sample);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linux audit rules file — defines rules for the auditd daemon to log kernel-level security events such as file accesses and system calls.',
    usedFor: [
      { label: 'auditd documentation', description: 'Linux audit framework documentation', href: 'https://man7.org/linux/man-pages/man8/auditd.8.html' },
      { label: 'audit.rules manual', description: 'Linux audit rules file format', href: 'https://man7.org/linux/man-pages/man7/audit.rules.7.html' },
    ],
  },
};
export default plugin;
