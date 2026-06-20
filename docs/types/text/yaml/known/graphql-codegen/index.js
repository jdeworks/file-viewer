export const plugin = {
  id: 'graphql-codegen',
  label: 'GraphQL Code Generator',
  tags: ['graphql', 'codegen', 'typescript'],
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'codegen.yml' || n === 'codegen.yaml' || n === '.codegenrc' || n === '.codegenrc.yml' || n === '.codegenrc.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GraphQL Code Generator configuration — defines schema sources, document globs, and output targets with plugins for generating TypeScript types, resolvers, and operation-specific hooks.',
    usedFor: [{ label: 'GraphQL Code Generator', description: 'Generate strongly-typed TypeScript code from GraphQL schemas and operations.', href: 'https://the-guild.dev/graphql/codegen' }],
  },
};
export default plugin;
