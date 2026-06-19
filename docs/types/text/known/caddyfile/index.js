export default {
  id: 'caddyfile',
  label: 'Caddyfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'Caddyfile' || name === 'Caddyfile.dev' || name === 'Caddyfile.prod';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Caddy web server configuration — defines site addresses, TLS, reverse proxies, and file server settings.',
    usedBy: [{ label: 'Caddy', description: 'Automatic HTTPS web server with simple config', href: 'https://caddyserver.com/docs/caddyfile' }],
  },
};
