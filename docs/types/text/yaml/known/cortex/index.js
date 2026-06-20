export const plugin = {
  id: 'cortex',
  label: 'Grafana Cortex',
  tags: ['observability', 'metrics', 'prometheus', 'grafana'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'cortex.yaml' || n === 'cortex.yml' || n === 'cortex-config.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grafana Cortex horizontally-scalable Prometheus configuration — server, blocks storage, distributor, ingester, store gateway, compactor, and ruler storage.',
    usedFor: [{ label: 'Grafana Cortex', description: 'Horizontally-scalable, highly-available, multi-tenant, long-term Prometheus metrics storage.', href: 'https://cortexmetrics.io/docs/' }],
  },
};
export default plugin;
