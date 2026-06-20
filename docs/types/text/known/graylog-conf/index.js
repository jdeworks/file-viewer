export default {
  id: 'graylog-conf',
  label: 'Graylog server config',
  match(intake) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'graylog.conf' || n === 'graylog-server.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Graylog log management server configuration — defines node identity, HTTP bindings, Elasticsearch hosts, MongoDB connection, and data retention settings.',
    usedFor: [{ label: 'Graylog', description: 'Open-source log management platform for collecting, indexing, and analyzing log data.', href: 'https://docs.graylog.org/docs/server-configuration' }],
  },
};
