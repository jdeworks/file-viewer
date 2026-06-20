export default {
  id: 'hosts-file',
  label: 'Hosts File',
  match(intake) {
    const fullPath = intake.name || intake.filename || '';
    const n = fullPath.split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'hosts' && (text.includes('localhost') || text.includes('127.0.0.1'))) return true;
    if (n === 'hosts.txt') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Host name resolution table — maps IP addresses to hostnames, bypassing DNS for local overrides.',
    usedFor: [{ label: '/etc/hosts', description: 'System hostname resolution', href: 'https://man7.org/linux/man-pages/man5/hosts.5.html' }],
  },
};
