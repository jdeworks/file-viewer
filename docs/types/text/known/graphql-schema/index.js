export default {
  id: 'graphql-schema',
  label: 'GraphQL Schema',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n.endsWith('.graphql') || n.endsWith('.gql')) return true;
    if (n === 'schema.graphql' || n === 'schema.gql') return true;
    // Content heuristic — require GraphQL SDL block syntax `type Query { ... }` (no `=`
    // between the name and the brace) so this doesn't false-positive on TS/Flow type
    // aliases like `type Query = {...}`, which are common in ordinary code files.
    if (/\btype\s+(Query|Mutation|Subscription)\s*\{/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GraphQL schema definition — declares types, queries, mutations, and subscriptions for a GraphQL API.',
    usedFor: [{ label: 'GraphQL', description: 'A query language for APIs', href: 'https://graphql.org/learn/schema/' }],
  },
};
