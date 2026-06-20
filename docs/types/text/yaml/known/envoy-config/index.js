export default {
  id: 'envoy-config',
  label: 'Envoy proxy config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'envoy.yaml' && n !== 'envoy.yml') return false;
    return (intake.text || '').includes('static_resources') || (intake.text || '').includes('node:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Envoy proxy static configuration — node identity, listeners, routes, and clusters.',
    usedFor: [{ label: 'Envoy Proxy', description: 'High-performance L7 proxy and service mesh data plane', href: 'https://www.envoyproxy.io/docs/envoy/latest/configuration/overview/examples' }],
  },
};
