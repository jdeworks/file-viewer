export default {
  id: 'logstash-conf',
  label: 'Logstash pipeline config',
  match(intake) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'logstash.conf' || (n.startsWith('logstash-') && n.endsWith('.conf')) || n === 'logstash.yml' || n === 'logstash.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Logstash pipeline configuration — defines input sources, filter transformations, and output destinations using a Ruby-like DSL.',
    usedFor: [{ label: 'Logstash', description: 'Server-side data processing pipeline for ingesting, transforming, and forwarding log data', href: 'https://www.elastic.co/guide/en/logstash/current/configuration.html' }],
  },
};
