export const plugin = {
  id: 'grafana-alloy',
  label: 'Grafana Alloy',
  tags: ['observability', 'telemetry', 'grafana', 'pipeline'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'config.alloy' || n.endsWith('.alloy');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grafana Alloy (River syntax) telemetry pipeline configuration — defines component blocks for scraping, forwarding, receiving, and processing observability data.',
    usedFor: [{ label: 'Grafana Alloy', description: 'OpenTelemetry Collector distribution and Grafana Agent successor for metrics, logs, traces, and profiles.', href: 'https://grafana.com/docs/alloy/latest/' }],
  },
};
export default plugin;
