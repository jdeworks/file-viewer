// Elasticsearch configuration: elasticsearch.yml
export default {
  id: 'elasticsearch-config',
  label: 'Elasticsearch config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'elasticsearch.yml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('cluster.name:') && t.includes('node.name:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elasticsearch configuration — cluster/node identity, network, discovery, and X-Pack security settings.',
    usedFor: [{ label: 'Elasticsearch', description: 'Configure Elasticsearch cluster topology, network binding, discovery, and X-Pack security.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/settings.html' }],
  },
};
