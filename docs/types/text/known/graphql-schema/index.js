export default {
  id: 'graphql-schema',
  label: 'GraphQL Schema',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n.endsWith('.graphql') || n.endsWith('.gql')) return true;
    if (n === 'schema.graphql' || n === 'schema.gql') return true;
    // Content heuristic
    if (text.includes('type Query') || text.includes('type Mutation') || text.includes('type Subscription')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GraphQL schema definition — declares types, queries, mutations, and subscriptions for a GraphQL API.',
    usedFor: [{ label: 'GraphQL', description: 'A query language for APIs', href: 'https://graphql.org/learn/schema/' }],
  },
};
