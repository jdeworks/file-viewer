export default {
  id: 'beats-config',
  label: 'Elastic Beats',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'filebeat.yml' || n === 'metricbeat.yml' || n === 'heartbeat.yml' || n === 'auditbeat.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elastic Beats configuration — inputs/modules, output (Elasticsearch/Logstash/Kafka), and processors.',
    usedFor: [{ label: 'Data shipping', description: 'Configure Elastic Beats agents to collect logs, metrics, uptime, or audit events and ship to Elasticsearch, Logstash, or Kafka.', href: 'https://www.elastic.co/guide/en/beats/libbeat/current/beats-reference.html' }],
  },
};
