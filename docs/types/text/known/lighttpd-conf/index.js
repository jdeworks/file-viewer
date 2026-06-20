export default {
  id: 'lighttpd-conf',
  label: 'Lighttpd Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'lighttpd.conf' || n.startsWith('lighttpd') && n.endsWith('.conf')) return true;
    if (text.includes('server.document-root') && text.includes('server.port')) return true;
    if (text.includes('mod_fastcgi') || text.includes('mod_proxy')) {
      if (text.includes('server.modules')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Lighttpd web server configuration — a lightweight, high-performance HTTP server popular for embedded systems and high-traffic sites.',
    usedFor: [{ label: 'Lighttpd', description: 'High-performance web server optimized for low memory usage', href: 'https://www.lighttpd.net/' }],
  },
};
