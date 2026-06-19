export default {
  id: 'loki-config',
  label: 'Loki config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'loki-config.yaml' || n === 'loki-config.yml' || n === 'loki.yaml' || n === 'loki.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grafana Loki configuration — defines server settings, storage backends, schema, ingestion limits, and compaction.',
    usedFor: [{ label: 'Loki', description: 'Horizontally-scalable, highly-available log aggregation system by Grafana Labs', href: 'https://grafana.com/docs/loki/latest/configuration/' }],
  },
};
