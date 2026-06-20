export default {
  id: 'newrelic-config',
  label: 'New Relic Agent',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const t = intake.text || intake.textSample || '';
    return (n === 'newrelic.yml' || n === 'newrelic.yaml') && t.includes('common');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'New Relic agent configuration — app name, license key, log level, and environment overrides.',
    usedFor: [{ label: 'APM monitoring', description: 'Configure New Relic APM agent: app name, license key, tracing, and per-environment settings.', href: 'https://docs.newrelic.com/docs/apm/agents/' }],
  },
};
