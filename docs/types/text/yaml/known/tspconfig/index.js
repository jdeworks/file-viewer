export const plugin = {
  id: 'tspconfig',
  label: 'TypeSpec config',
  tags: ['typespec', 'microsoft', 'api', 'openapi'],
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'tspconfig.yaml' || n === 'tspconfig.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'TypeSpec compiler configuration — controls emitters (OpenAPI 3, Autorest, etc.), output directories, imports, and environment variables for API definition compilation.',
    usedFor: [{ label: 'TypeSpec', description: 'Microsoft\'s API definition language that compiles to OpenAPI, JSON Schema, gRPC, and more.', href: 'https://typespec.io/docs/handbook/configuration' }],
  },
};
export default plugin;
