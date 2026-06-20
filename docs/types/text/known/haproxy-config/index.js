export default {
  id: 'haproxy-config',
  label: 'HAProxy config',
  match(intake) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'haproxy.cfg' || n === 'haproxy.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HAProxy load balancer configuration — global settings, defaults, frontends, and backends.',
    usedFor: [{ label: 'HAProxy', description: 'High availability load balancer and proxy server', href: 'http://www.haproxy.org/download/2.8/doc/configuration.txt' }],
  },
};
