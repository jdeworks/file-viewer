export default {
  id: 'datadog-config',
  label: 'Datadog agent config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'datadog.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Datadog agent configuration — API key, tags, log collection, APM, and feature flags.',
    usedFor: [{ label: 'Observability', description: 'Configure the Datadog agent for metrics, logs, APM, and infrastructure monitoring.', href: 'https://docs.datadoghq.com/agent/configuration/agent-configuration-files/' }],
  },
};
