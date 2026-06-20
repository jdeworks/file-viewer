export default {
  id: 'resolv-conf',
  label: 'resolv.conf',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'resolv.conf') return true;
    if (text.includes('nameserver ') && text.includes('search ')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'DNS resolver configuration — defines nameservers, search domains, and resolver options.',
    usedFor: [{ label: 'resolv.conf', description: 'Linux DNS resolver configuration', href: 'https://man7.org/linux/man-pages/man5/resolv.conf.5.html' }],
  },
};
