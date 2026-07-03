export default {
  id: 'haproxy-conf',
  label: 'HAProxy Config',
  tags: ['haproxy', 'load-balancer', 'proxy', 'config'],
  // NOTE: this plugin's filename match is a strict subset of haproxy-cfg's, and haproxy-cfg is
  // registered earlier in docs/known/registry.js's KNOWN array (first-match-wins), so under the
  // current registry order this plugin never actually wins for real files — it is fully shadowed.
  // Kept behaviorally correct (rather than deleted) in case registry order ever changes.
  match(intake, baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'haproxy.cfg' || n === 'haproxy.conf') return true;
    // Content-only fallback: guard against cross-baseType false positives (see haproxy-cfg).
    if (baseType?.id !== 'code') return false;
    const t = intake.text || '';
    if (!(/^frontend\b/m.test(t) && /^backend\b/m.test(t))) return false;
    return /^\s*(bind|mode|balance|default_backend|acl)\s/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HAProxy load balancer configuration — global settings, defaults, frontends, backends, and listen blocks.',
    usedFor: [{ label: 'HAProxy', description: 'High availability load balancer and proxy server', href: 'http://www.haproxy.org/download/2.8/doc/configuration.txt' }],
  },
};
