export default {
  id: 'grafana-ini',
  label: 'Grafana config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'grafana.ini' || n === 'grafana-config.ini') return true;
    if (n === 'defaults.ini') {
      const t = intake.text || '';
      return t.includes('[server]') && (t.includes('http_port') || (t.includes('[database]') && t.includes('type =')));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Grafana server configuration — HTTP settings, auth providers, database backend, and data paths.',
    usedFor: [{ label: 'Grafana config', description: 'Configure Grafana server HTTP port, auth providers, database, and plugin paths.', href: 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/' }],
  },
};
