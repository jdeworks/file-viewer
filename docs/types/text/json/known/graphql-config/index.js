export default {
  id: 'graphql-config',
  label: 'GraphQL Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'graphql.config.json' || name === '.graphqlrc.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GraphQL Config — shows schema path, documents glob, and extensions.',
    usedFor: [{ label: 'GraphQL tooling', description: 'Shared config for GraphQL tools and editors', href: 'https://the-guild.dev/graphql/config' }],
  },
};
