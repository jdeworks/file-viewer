export default {
  id: 'headscale-config',
  label: 'Headscale config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || intake.textSample || '';
    return n === 'config.yaml' && (
      (text.includes('server_url:') && text.includes('noise:')) ||
      (text.includes('private_key_path:') && text.includes('ip_prefixes:'))
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Headscale configuration — WireGuard VPN control plane server settings, database, DERP relays, DNS, and security keys.',
    usedFor: [
      { label: 'Headscale', description: 'Open-source self-hosted WireGuard VPN control plane compatible with Tailscale clients.', href: 'https://headscale.net/docs/ref/configuration/' },
    ],
  },
};
