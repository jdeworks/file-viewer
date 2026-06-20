export const plugin = {
  id: 'cloudflared',
  label: 'Cloudflare Tunnel',
  tags: ['cloudflare', 'tunnel', 'zero-trust', 'networking'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'cloudflared.yml' || n === 'cloudflared.yaml') return true;
    if (n === 'config.yml' || n === 'config.yaml') {
      const t = intake.text || intake.textSample || '';
      return t.includes('tunnel:') && (t.includes('ingress:') || t.includes('credentials-file:'));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Cloudflare Tunnel (cloudflared) configuration — defines tunnel ID, credentials, and ingress routing rules.',
    usedFor: [{ label: 'Cloudflare Tunnel', description: 'Zero-trust network tunneling without opening firewall ports', href: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/' }],
  },
};
export default plugin;
