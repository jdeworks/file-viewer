export default {
  id: 'victoria-metrics-config',
  label: 'VictoriaMetrics Config',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'victoria-metrics.yml' || n === 'vmagent.yml' || n === 'vmalert.yml' || n === 'victoriametrics.yml') return true;
    if (text.includes('scrape_configs:') && text.includes('remote_write:')) return true;
    // Avoid the generic groups+expr+severity pattern — Prometheus uses the same format for its
    // rules files (prometheus-rules.yaml etc.), so a content-only check causes false-positives.
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'VictoriaMetrics configuration — scrape configs, remote write, and alerting rules for the time-series database.',
    usedFor: [{ label: 'VictoriaMetrics', description: 'Fast Prometheus-compatible time series database', href: 'https://docs.victoriametrics.com/' }],
  },
};
