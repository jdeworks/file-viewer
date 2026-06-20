// Apache Cassandra configuration: cassandra.yaml
export default {
  id: 'cassandra-config',
  label: 'Cassandra config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'cassandra.yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('cluster_name:') && t.includes('seed_provider:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache Cassandra configuration — cluster name, seeds, listen address, data/commitlog directories, compaction, and authentication.',
    usedFor: [{ label: 'Apache Cassandra', description: 'Configure Cassandra cluster topology, storage, compaction throughput, and security.', href: 'https://cassandra.apache.org/doc/latest/cassandra/configuration/cass_yaml_file.html' }],
  },
};
