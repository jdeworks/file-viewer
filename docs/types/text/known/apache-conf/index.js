export default {
  id: 'apache-conf',
  label: 'Apache Config',
  tags: ['apache', 'httpd', 'webserver', 'config'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || intake.textSample || '';
    if (['httpd.conf', 'apache2.conf', 'apache.conf', '.htaccess'].includes(n)) return true;
    if (n.startsWith('apache-') && n.endsWith('.conf')) return true;
    if (text.includes('<VirtualHost') || (text.includes('ServerName') && text.includes('DocumentRoot'))) return true;
    if (n.endsWith('.htaccess') && (text.includes('RewriteEngine') || text.includes('AuthType') || text.includes('Options '))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache HTTP Server configuration — virtual hosts, directory access, SSL, modules, and rewrite rules.',
    usedFor: [{ label: 'Apache', description: 'Apache HTTP Server configuration', href: 'https://httpd.apache.org/docs/2.4/configuring.html' }],
  },
};
