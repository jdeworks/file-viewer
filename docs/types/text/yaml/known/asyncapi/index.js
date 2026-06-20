export const plugin = {
  id: 'asyncapi',
  label: 'AsyncAPI',
  tags: ['api', 'event-driven', 'messaging', 'schema'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'asyncapi.yml' || n === 'asyncapi.yaml') return true;
    // content heuristic: check for asyncapi version field
    const t = intake.text || '';
    return /^asyncapi:\s*['"]?\d/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AsyncAPI specification — defines event-driven APIs and messaging systems (Kafka, MQTT, AMQP, WebSocket, etc.).',
    usedFor: [{ label: 'AsyncAPI', description: 'Specification format for event-driven and asynchronous APIs, similar to OpenAPI for REST.', href: 'https://www.asyncapi.com/docs' }],
  },
};
export default plugin;
