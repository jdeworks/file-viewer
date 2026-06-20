export default {
  id: 'nginx-conf',
  label: 'Nginx Config',
  tags: ['nginx', 'webserver', 'config'],
  match(intake) {
    const lower = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const path = (intake.name || intake.filename || '').toLowerCase();
    const text = intake.text || intake.textSample || '';
    if (lower === 'nginx.conf') return true;
    if (lower.startsWith('nginx-') && lower.endsWith('.conf')) return true;
    if ((path.includes('sites-available/') || path.includes('sites-enabled/') || path.includes('conf.d/')) && lower.endsWith('.conf')) return true;
    // Content guard: must look like nginx config
    if (text.includes('server {') && (text.includes('listen ') || text.includes('location '))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nginx web server configuration — defines server blocks, upstreams, locations, and proxy settings.',
    usedFor: [{ label: 'Nginx', description: 'High-performance web server and reverse proxy', href: 'https://nginx.org/en/docs/beginners_guide.html' }],
  },
};
