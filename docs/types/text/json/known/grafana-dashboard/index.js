export default {
  id: 'grafana-dashboard',
  label: 'Grafana Dashboard',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const text = intake.text || '';
    return text.includes('"panels"') && text.includes('"schemaVersion"');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grafana dashboard definition — panels, variables, time range, and visualization settings.',
    usedFor: [{ label: 'Dashboards', description: 'Grafana dashboard JSON model with panels, templating variables, and time range configuration.', href: 'https://grafana.com/docs/grafana/latest/dashboards/' }],
  },
};
