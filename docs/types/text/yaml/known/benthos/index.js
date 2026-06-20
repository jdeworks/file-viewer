export const plugin = {
  id: 'benthos',
  label: 'Benthos / Redpanda Connect',
  tags: ['streaming', 'data-pipeline', 'messaging'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'benthos.yaml' || n === 'benthos.yml' || n === 'redpanda-connect.yaml' || n === 'connect.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Benthos / Redpanda Connect pipeline configuration — input, output, pipeline processors, buffer, logger, and metrics.',
    usedFor: [{ label: 'Data streaming', description: 'Configure Benthos (Redpanda Connect) to move data between sources and sinks with configurable processors, buffers, and observability.', href: 'https://www.benthos.dev/docs/configuration/about' }],
  },
};
export default plugin;
