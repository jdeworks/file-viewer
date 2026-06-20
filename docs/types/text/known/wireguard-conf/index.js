export default {
  id: 'wireguard-conf',
  label: 'WireGuard VPN',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (/^wg\d+\.conf$/.test(n)) return true;
    const text = intake.text || '';
    return text.includes('[Interface]') && text.includes('PrivateKey');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'WireGuard VPN configuration — interface settings and peer definitions for a WireGuard tunnel.',
    usedFor: [{ label: 'wg-quick', description: 'WireGuard VPN configuration file used by wg-quick and the wg tool', href: 'https://www.wireguard.com/quickstart/' }],
  },
};
