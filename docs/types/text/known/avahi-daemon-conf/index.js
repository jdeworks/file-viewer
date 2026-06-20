export const plugin = {
  id: 'avahi-daemon-conf',
  label: 'Avahi Daemon Config',
  tags: ['avahi', 'mdns', 'zeroconf', 'networking', 'linux'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'avahi-daemon.conf') return true;
    const text = intake.text || '';
    return (
      /^\[server\]/m.test(text) &&
      /(host-name=|domain-name=)/.test(text) &&
      /(use-ipv4=|use-ipv6=)/.test(text)
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Avahi mDNS/Zeroconf daemon configuration — controls hostname advertisement, network interface binding, and service publishing on the local network.',
    usedFor: [
      { label: 'Avahi documentation', description: 'Official Avahi daemon configuration reference', href: 'https://avahi.org/doxygen/html/' },
    ],
  },
};
export default plugin;
