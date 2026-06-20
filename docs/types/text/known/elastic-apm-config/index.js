export default {
  id: 'elastic-apm-config',
  label: 'Elastic APM Agent',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const t = intake.text || intake.textSample || '';
    if (n === 'elastic-apm-agent.properties') return true;
    if (n === 'elastic-apm.yaml' && (t.includes('service_name') || t.includes('service_name:'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elastic APM agent configuration — service name, server URLs, environment, sampling, and secret token.',
    usedFor: [{ label: 'APM tracing', description: 'Configure the Elastic APM agent: service identity, server connection, sampling rate, and logging.', href: 'https://www.elastic.co/guide/en/apm/agent/' }],
  },
};
