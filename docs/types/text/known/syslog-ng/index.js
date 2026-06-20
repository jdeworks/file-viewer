export const plugin = {
  id: 'syslog-ng',
  label: 'syslog-ng',
  tags: ['logging', 'syslog', 'system'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'syslog-ng.conf') return true;
    // content heuristic
    const t = intake.text || intake.textSample || '';
    return t.includes('@version:') && (t.includes('source(') || t.includes('destination(') || t.includes('log {'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'syslog-ng system logging daemon configuration — defines sources, destinations, filters, and log paths.',
    usedFor: [{ label: 'syslog-ng', description: 'A high-performance log management solution', href: 'https://www.syslog-ng.com/' }],
  },
};
export default plugin;
