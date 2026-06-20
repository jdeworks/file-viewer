export default {
  id: 'mimir',
  label: 'Grafana Mimir',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'mimir.yaml' || n === 'mimir.yml' || n === 'mimir-config.yaml' || n === 'mimir-config.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grafana Mimir metrics configuration — server, blocks storage, distributor, ingester, store gateway, compactor, and per-tenant limits.',
    usedFor: [{ label: 'Metrics storage', description: 'Configure Grafana Mimir for horizontally-scalable, highly-available Prometheus-compatible metrics storage.', href: 'https://grafana.com/docs/mimir/latest/configure/' }],
  },
};
