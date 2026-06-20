export default {
  id: 'pihole-setupvars',
  label: 'Pi-hole Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    // pihole-FTL.conf: match by filename only
    if (n === 'pihole-FTL.conf') return true;
    // setupVars.conf: require Pi-hole-specific content
    if (n === 'setupVars.conf') {
      const text = intake.text || '';
      return text.includes('PIHOLE_INTERFACE=') || text.includes('PIHOLE_DNS_1=');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pi-hole DNS ad-blocker configuration — network interface, upstream DNS servers, blocking status, and DNSSEC settings.',
    usedFor: [{ label: 'Pi-hole', description: 'Pi-hole DNS-level ad blocker configuration file', href: 'https://docs.pi-hole.net/' }],
  },
};
