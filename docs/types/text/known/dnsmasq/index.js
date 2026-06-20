export const plugin = {
  id: 'dnsmasq',
  label: 'dnsmasq',
  tags: ['dns', 'dhcp', 'networking', 'dnsmasq'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'dnsmasq.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'dnsmasq configuration — DNS forwarding, local DNS overrides, and DHCP server settings.',
    usedFor: [{ label: 'dnsmasq', description: 'Lightweight DNS forwarder and DHCP server for small networks', href: 'https://thekelleys.org.uk/dnsmasq/doc.html' }],
  },
};
export default plugin;
