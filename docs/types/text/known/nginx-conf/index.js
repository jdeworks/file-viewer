export default {
  id: 'nginx-conf',
  label: 'nginx config',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'nginx.conf' || name.endsWith('.nginx');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nginx web server configuration file — defines server blocks, location rules, upstreams, and proxy settings.',
    usedFor: [{ label: 'Nginx config', description: 'High-performance HTTP server and reverse proxy configuration', href: 'https://nginx.org/en/docs/' }],
  },
};
