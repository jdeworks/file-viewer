export const plugin = {
  id: 'limits-conf',
  label: 'Limits Config',
  tags: ['pam', 'limits', 'security', 'linux', 'ulimit'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop();
    const path = intake.name || intake.filename || '';
    if (name === 'limits.conf') return true;
    if (name.endsWith('.conf') && path.includes('security/limits')) return true;
    // Content-based: 3+ lines matching PAM limits pattern
    const sample = intake.textSample || intake.text || '';
    const matches = sample.split(/\r?\n/).filter((l) => /^\s*[*@\w]+\s+(soft|hard|-)\s+\w/.test(l));
    return matches.length >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PAM limits configuration file — defines resource limits (e.g. open files, processes, memory) for users and groups.',
    usedFor: [
      { label: 'limits.conf manual', description: 'Linux PAM limits.conf documentation', href: 'https://man7.org/linux/man-pages/man5/limits.conf.5.html' },
    ],
  },
};
export default plugin;
