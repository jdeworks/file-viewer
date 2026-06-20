export default {
  id: 'caddyfile',
  label: 'Caddyfile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'caddyfile') return true;
    if (n === 'caddyfile.dev' || n === 'caddyfile.prod') return true;
    // Content heuristic: reverse_proxy or tls directive suggests Caddy
    if (text.includes('reverse_proxy') && (text.includes('tls') || text.includes('encode'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Caddy web server configuration — defines site blocks with TLS, reverse proxies, and middleware.',
    usedFor: [{ label: 'Caddy', description: 'Fast, extensible multi-platform HTTP/1-2-3 web server with auto-HTTPS', href: 'https://caddyserver.com/docs/caddyfile' }],
  },
};
