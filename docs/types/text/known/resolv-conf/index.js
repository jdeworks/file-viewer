export default {
  id: 'resolv-conf',
  label: 'resolv.conf',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'resolv.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'DNS resolver configuration — nameservers, search domains, and resolver options.',
    usedFor: [{ label: 'resolv.conf', description: 'DNS resolver configuration used by the C library resolver', href: 'https://man7.org/linux/man-pages/man5/resolv.conf.5.html' }],
  },
};
