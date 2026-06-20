export default {
  id: 'squid-conf',
  label: 'Squid proxy config',
  match(intake) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'squid.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Squid HTTP proxy and web cache configuration — ports, ACLs, access rules, and cache settings.',
    usedFor: [{ label: 'Squid Cache', description: 'Caching proxy for HTTP, HTTPS, FTP, and more', href: 'http://www.squid-cache.org/Doc/config/' }],
  },
};
