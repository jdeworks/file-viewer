export default {
  id: 'dhcpd-conf',
  label: 'DHCP Server Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'dhcpd.conf' || n === 'dhcp.conf') return true;
    if (text.includes('subnet') && text.includes('netmask') && (text.includes('range') || text.includes('default-lease-time'))) return true;
    if (text.includes('ddns-update-style') && text.includes('subnet')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ISC DHCP server configuration — defines IP address pools, lease times, and host reservations for a DHCP server.',
    usedFor: [{ label: 'ISC DHCP', description: 'Internet Systems Consortium DHCP Server', href: 'https://www.isc.org/dhcp/' }],
  },
};
