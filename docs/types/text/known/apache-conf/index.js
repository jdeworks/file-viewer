export default {
  id: 'apache-conf',
  label: 'Apache Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'httpd.conf' || n === 'apache2.conf' || n === 'apache.conf') return true;
    if (n.endsWith('.conf') && text.includes('<VirtualHost') && text.includes('ServerName')) return true;
    if (n.endsWith('-le-ssl.conf') && text.includes('SSLCertificateFile')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache HTTP Server configuration — virtual hosts, directory access, SSL, modules, and rewrite rules.',
    usedFor: [{ label: 'Apache', description: 'Apache HTTP Server configuration', href: 'https://httpd.apache.org/docs/2.4/configuring.html' }],
  },
};
