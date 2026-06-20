export default {
  id: 'keepalived-conf',
  label: 'Keepalived Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'keepalived.conf') return true;
    if (text.includes('vrrp_instance') && (text.includes('virtual_router_id') || text.includes('virtual_ipaddress'))) return true;
    if (text.includes('global_defs') && text.includes('vrrp_instance')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Keepalived configuration — implements VRRP protocol for Linux to provide high availability via virtual IP addresses.',
    usedFor: [{ label: 'Keepalived', description: 'Routing software providing load balancing and high availability for Linux', href: 'https://keepalived.org/' }],
  },
};
