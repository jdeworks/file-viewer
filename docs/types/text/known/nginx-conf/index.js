export default {
  id: 'nginx-conf',
  label: 'Nginx Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'nginx.conf') return true;
    if (n === 'default.conf' && text.includes('server {')) return true;
    if ((n.endsWith('.conf') || n.endsWith('.nginx')) && text.includes('server {') && text.includes('listen')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nginx web server configuration — defines server blocks, upstreams, locations, and proxy settings.',
    usedFor: [{ label: 'Nginx', description: 'High-performance web server and reverse proxy', href: 'https://nginx.org/en/docs/beginners_guide.html' }],
  },
};
