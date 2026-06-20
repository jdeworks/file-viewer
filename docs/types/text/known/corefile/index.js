export default {
  id: 'corefile',
  label: 'Corefile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'corefile') return true;
    // CoreDNS zone blocks: ".:53 {" or "cluster.local:53 {"
    if (text.includes('forward') && (text.includes('cache') || text.includes('health')) && text.includes('{')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CoreDNS Corefile — defines DNS server zones, forwarders, plugins, and health endpoints.',
    usedFor: [{ label: 'CoreDNS', description: 'DNS server used in Kubernetes and beyond', href: 'https://coredns.io/manual/toc/' }],
  },
};
