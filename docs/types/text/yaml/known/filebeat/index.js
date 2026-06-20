export default {
  id: 'filebeat',
  label: 'Filebeat',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'filebeat.yml' || n === 'filebeat.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elastic Filebeat configuration — log/filestream inputs, modules, Elasticsearch/Logstash/Kafka output, and processors.',
    usedFor: [{ label: 'Log shipping', description: 'Configure Filebeat to collect log files, stdin, TCP/UDP streams, Kafka topics, or S3 objects and forward them to Elasticsearch, Logstash, Kafka, or other outputs.', href: 'https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-overview.html' }],
  },
};
