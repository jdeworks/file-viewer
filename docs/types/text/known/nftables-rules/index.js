export default {
  id: 'nftables-rules',
  label: 'nftables Rules',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'nftables.conf' || n === 'nftables.rules' || n.endsWith('.nft')) return true;
    if (text.includes('table ') && text.includes('chain ') && (text.includes('type filter') || text.includes('type nat'))) return true;
    if ((text.includes('nft ') || text.includes('#!/usr/sbin/nft')) && text.includes('table')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'nftables firewall rules — the modern Linux packet filtering framework replacing iptables with a unified syntax for filter, NAT, and mangle operations.',
    usedFor: [{ label: 'nftables', description: 'Linux kernel packet classification framework replacing iptables/ip6tables/ebtables', href: 'https://nftables.org/projects/nftables/index.html' }],
  },
};
