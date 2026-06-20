export default {
  id: 'haproxy-conf',
  label: 'HAProxy Config',
  tags: ['haproxy', 'load-balancer', 'proxy', 'config'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'haproxy.cfg' || n === 'haproxy.conf') return true;
    const t = intake.text || '';
    return /^frontend\b/m.test(t) && /^backend\b/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HAProxy load balancer configuration — global settings, defaults, frontends, backends, and listen blocks.',
    usedFor: [{ label: 'HAProxy', description: 'High availability load balancer and proxy server', href: 'http://www.haproxy.org/download/2.8/doc/configuration.txt' }],
  },
};
