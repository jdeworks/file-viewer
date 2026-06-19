export default {
  id: 'prometheus-config',
  label: 'Prometheus config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'prometheus.yml' || n === 'prometheus.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prometheus server configuration — scrape jobs, alerting rules, and remote write/read targets.',
    usedFor: [{ label: 'Metrics collection', description: 'Configure Prometheus scrape intervals, jobs, alerting rules, and remote storage.', href: 'https://prometheus.io/docs/prometheus/latest/configuration/configuration/' }],
  },
};
