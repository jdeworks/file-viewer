export default {
  id: 'tempo',
  label: 'Grafana Tempo',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'tempo.yaml' || n === 'tempo.yml' || n === 'tempo-config.yaml' || n === 'tempo-config.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grafana Tempo distributed tracing configuration — server ports, receivers, ingester, storage backend, query frontend, and metrics generator.',
    usedFor: [{ label: 'Distributed tracing', description: 'Configure Grafana Tempo for distributed tracing with multiple receiver protocols (OTLP, Jaeger, Zipkin) and various storage backends.', href: 'https://grafana.com/docs/tempo/latest/configuration/' }],
  },
};
