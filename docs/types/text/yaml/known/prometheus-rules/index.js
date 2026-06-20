export default {
  id: 'prometheus-rules',
  label: 'Prometheus Rules',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.text || '';
    return text.includes('groups:') && (text.includes('alert:') || text.includes('record:')) && text.includes('expr:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prometheus alerting and recording rules — groups of alert conditions and derived metrics expressions.',
    usedFor: [{ label: 'Alert rules', description: 'Define Prometheus alerting rules with conditions, severity labels, and summary annotations.', href: 'https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/' }],
  },
};
