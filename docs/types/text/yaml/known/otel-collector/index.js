export default {
  id: 'otel-collector',
  label: 'OTel Collector',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return ['otel-collector-config.yaml', 'otel-collector-config.yml', 'otelcol.yaml', 'otelcol.yml',
      'otelcol-config.yaml', 'otelcol-config.yml', 'collector.yaml', 'collector.yml',
      'opentelemetry-collector.yaml', 'opentelemetry-collector.yml'].includes(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenTelemetry Collector configuration — receivers, processors, exporters, and service pipelines.',
    usedFor: [{ label: 'Observability pipeline', description: 'Configure OTel Collector receivers, processors, exporters, and telemetry pipelines.', href: 'https://opentelemetry.io/docs/collector/configuration/' }],
  },
};
