export const plugin = {
  id: 'openapi-generator',
  label: 'OpenAPI Generator config',
  tags: ['openapi', 'codegen', 'sdk', 'api'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'openapi-generator-config.yaml' || n === 'openapi-generator-config.yml'
      || n === 'openapi-generator.yaml' || n === '.openapi-generator-ignore'
      || n === 'generator-config.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenAPI Generator CLI configuration — specifies the generator (language/framework), input spec, output directory, and code generation options such as package names, model property naming, and language-specific properties.',
    usedFor: [
      { label: 'OpenAPI Generator', description: 'Generate client SDKs, server stubs, and documentation from OpenAPI specifications.', href: 'https://openapi-generator.tech' },
    ],
  },
};
export default plugin;
