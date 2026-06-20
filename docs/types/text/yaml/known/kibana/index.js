export const plugin = {
  id: 'kibana',
  label: 'Kibana',
  tags: ['elastic', 'kibana', 'visualization', 'logging'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'kibana.yml' || n === 'kibana.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kibana configuration — server, Elasticsearch connection, security, and plugin settings.',
    usedFor: [{ label: 'Kibana', description: 'Configure Kibana: server endpoint, Elasticsearch hosts, X-Pack security, logging, Fleet, and Reporting.', href: 'https://www.elastic.co/guide/en/kibana/current/settings.html' }],
  },
};
export default plugin;
