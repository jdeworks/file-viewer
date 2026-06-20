export default {
  id: 'netbird-config',
  label: 'NetBird Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'netbird.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NetBird client configuration — management/signal URLs, WireGuard interface, peer key, and connectivity settings.',
    usedFor: [{ label: 'NetBird', description: 'WireGuard-based overlay VPN client configuration', href: 'https://netbird.io/docs/' }],
  },
};
