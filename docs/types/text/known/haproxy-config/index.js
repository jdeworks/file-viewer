export default {
  id: 'haproxy-config',
  label: 'HAProxy config',
  // NOTE: this plugin's filename match ('haproxy.cfg'/'haproxy.conf') is identical to (a subset
  // of) haproxy-cfg's, and haproxy-cfg is registered earlier in docs/known/registry.js's KNOWN
  // array (first-match-wins), so under the current registry order this plugin never actually
  // wins for a real file — it is fully shadowed/unreachable dead code. Kept behaviorally correct
  // (rather than deleted) in case registry order ever changes.
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
