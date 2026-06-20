export default {
  id: 'named-conf',
  label: 'BIND DNS Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'named.conf' || n === 'named.conf.local' || n === 'named.conf.options' || n === 'named.conf.default-zones') return true;
    if (text.includes('options {') && text.includes('directory') && text.includes('listen-on')) return true;
    if (text.includes('zone "') && (text.includes('type master') || text.includes('type primary') || text.includes('type slave') || text.includes('type secondary'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'BIND DNS server configuration — defines zones, options, and ACLs for the Berkeley Internet Name Domain server.',
    usedFor: [{ label: 'BIND9', description: 'Berkeley Internet Name Domain — most common DNS server software', href: 'https://www.isc.org/bind/' }],
  },
};
