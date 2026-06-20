export const plugin = {
  id: 'jsonnet',
  label: 'Jsonnet',
  tags: ['jsonnet', 'data', 'templating', 'configuration'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.jsonnet') || name.endsWith('.libsonnet');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jsonnet is a data templating language that extends JSON with comments, variables, functions, conditionals, and imports, producing plain JSON output.',
    usedFor: [{ label: 'jsonnet.org', description: 'The Jsonnet data templating language', href: 'https://jsonnet.org/' }],
  },
};
export default plugin;
