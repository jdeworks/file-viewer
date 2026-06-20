export default {
  id: 'dynatrace-config',
  label: 'Dynatrace OneAgent',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const t = intake.text || intake.textSample || '';
    return n === 'dtconfig.yaml' || (t.includes('dynatrace:') && t.includes('apiUrl:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dynatrace OneAgent configuration — API URL, environment ID, tokens, network zones, and feature flags.',
    usedFor: [{ label: 'Observability', description: 'Configure Dynatrace OneAgent: API URL, environment ID, API tokens, network zones, and storage settings.', href: 'https://docs.dynatrace.com/docs/setup-and-configuration/dynatrace-oneagent/configuration' }],
  },
};
