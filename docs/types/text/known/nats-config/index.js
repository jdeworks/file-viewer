export default {
  id: 'nats-config',
  label: 'NATS Server Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'nats.conf' || n === 'nats-server.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'NATS messaging server configuration — host, port, cluster settings, authentication, TLS, and JetStream persistence.' },
};
