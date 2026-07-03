export default {
  id: 'fluentd-conf',
  label: 'Fluentd config',
  match(intake) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'fluent.conf' || n === 'fluentd.conf' || n === 'td-agent.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fluentd configuration — defines source inputs, filter rules, and match destinations using an XML-like tag syntax.',
    usedFor: [{ label: 'Fluentd', description: 'Open-source data collector for unified log management and forwarding', href: 'https://docs.fluentd.org/configuration' }],
  },
};
