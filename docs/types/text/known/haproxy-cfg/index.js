export const plugin = {
  id: 'haproxy-cfg',
  label: 'HAProxy Config',
  tags: ['haproxy', 'load-balancer', 'proxy', 'config'],
  match(intake, baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'haproxy.cfg' || n === 'haproxy.conf') return true;
    // Content-only fallback (no filename hit): "frontend"/"backend" alone are common enough
    // words (e.g. docker-compose service names, architecture docs) that they must not hijack
    // unrelated baseTypes. Only content-sniff generic/code text, and require an HAProxy-specific
    // directive alongside frontend+backend to avoid false positives.
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
export default plugin;
