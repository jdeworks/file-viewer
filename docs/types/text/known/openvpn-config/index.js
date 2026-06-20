export default {
  id: 'openvpn-config',
  label: 'OpenVPN config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n.endsWith('.ovpn')) return true;
    // .conf files that look like OpenVPN
    if (n.endsWith('.conf')) {
      const text = intake.text || '';
      return text.includes('remote ') && (text.includes('client') || text.includes('tls-auth') || text.includes('cipher'));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenVPN configuration — server/client mode, remote endpoint, encryption, certificates, and tunnel settings.',
    usedFor: [{ label: 'OpenVPN', description: 'Open source VPN solution', href: 'https://openvpn.net/community-resources/reference-manual-for-openvpn-2-4/' }],
  },
};
