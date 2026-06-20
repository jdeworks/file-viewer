export default {
  id: 'jaeger-config',
  label: 'Jaeger config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return ['jaeger.yml', 'jaeger.yaml', 'jaeger-config.yml', 'jaeger-config.yaml', 'jaeger-all-in-one.yml', 'jaeger-all-in-one.yaml'].includes(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jaeger distributed tracing configuration — query port, collector endpoints, storage backend, and sampling strategies.',
    usedFor: [{ label: 'Distributed tracing', description: 'Configure Jaeger all-in-one or components for distributed tracing with various storage backends.', href: 'https://www.jaegertracing.io/docs/latest/deployment/' }],
  },
};
