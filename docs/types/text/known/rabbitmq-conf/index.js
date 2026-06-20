export default {
  id: 'rabbitmq-conf',
  label: 'RabbitMQ Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'rabbitmq.conf' || n === 'rabbitmq-env.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'RabbitMQ message broker configuration — network listeners, TLS, resource limits, authentication, and management plugin settings.' },
};
