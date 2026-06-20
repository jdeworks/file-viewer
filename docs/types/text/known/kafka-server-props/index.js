export default {
  id: 'kafka-server-props',
  label: 'Kafka Server Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'server.properties' && n !== 'kafka-server.properties') return false;
    const t = intake.text || '';
    return t.includes('zookeeper.connect') || t.includes('broker.id') || t.includes('kafka');
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Apache Kafka broker configuration — broker ID, listener addresses, replication, log retention, and Zookeeper connection.' },
};
