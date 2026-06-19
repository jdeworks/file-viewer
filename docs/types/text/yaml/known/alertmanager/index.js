export default {
  id: 'alertmanager',
  label: 'Alertmanager config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'alertmanager.yml' || n === 'alertmanager.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prometheus Alertmanager configuration — routes, receivers, and inhibit rules.',
    usedFor: [{ label: 'Alert routing', description: 'Define how Prometheus alerts are routed to receivers like Slack, PagerDuty, or email.', href: 'https://prometheus.io/docs/alerting/latest/configuration/' }],
  },
};
