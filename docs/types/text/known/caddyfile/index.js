export default {
  id: 'caddyfile',
  label: 'Caddyfile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Defer to the dedicated CoreDNS plugin — Corefile shares `name { }` block syntax.
    if (n === 'corefile') return false;
    if (n === 'caddyfile') return true;
    const text = intake.textSample || intake.text || '';
    // Caddyfile: site addresses on their own line followed by { block }
    if (text.match(/^https?:\/\/[\w.-]+\s*\{/m) || text.match(/^[\w.-]+:\d+\s*\{/m)) return true;
    if (text.includes('reverse_proxy') && text.includes('tls') && text.match(/^\S+\s*\{/m)) return true;
    if (text.includes('encode gzip') && text.includes('file_server') && text.match(/^\S+\s*\{/m)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Caddy web server configuration — automatic HTTPS, reverse proxy, file server, and routes.',
    tags: ['caddy', 'webserver', 'proxy', 'https', 'config'],
  },
};
