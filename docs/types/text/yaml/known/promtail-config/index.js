export default {
  id: 'promtail-config',
  label: 'Promtail config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'promtail-config.yaml' || n === 'promtail-config.yml' || n === 'promtail.yaml' || n === 'promtail.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Promtail configuration — defines the Loki client endpoint, server settings, and log scrape configurations.',
    usedFor: [{ label: 'Promtail', description: 'Log shipping agent for Grafana Loki — scrapes logs and forwards them to Loki', href: 'https://grafana.com/docs/loki/latest/send-data/promtail/configuration/' }],
  },
};
