export default {
  id: 'headscale-config',
  label: 'Headscale Config',
  match(intake, baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const nameMatch = n === 'headscale.yaml' || n === 'headscale.yml' || n === 'headscale-config.yaml' || n === 'headscale-config.yml';
    const cfg = intake.parsed || {};
    const text = intake.text || intake.textSample || '';
    const contentMatch = (!!cfg.server_url && !!cfg.noise) ||
      (text.includes('server_url:') && text.includes('noise:')) ||
      (text.includes('private_key_path:') && text.includes('ip_prefixes:'));
    if (n === 'config.yaml' || n === 'config.yml') return contentMatch;
    return nameMatch || contentMatch;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Headscale configuration — self-hosted Tailscale-compatible WireGuard VPN control plane server settings, database, DERP relays, DNS, and security keys.',
    usedFor: [
      { label: 'Headscale', description: 'Open-source self-hosted Tailscale-compatible WireGuard VPN control plane server.', href: 'https://headscale.net/docs/ref/configuration/' },
    ],
  },
};
