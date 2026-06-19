export default {
  id: 'apollo',
  label: 'Apollo Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'apollo.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apollo GraphQL configuration — shows client, service endpoints, and schema locations.',
    usedFor: [{ label: 'Apollo Client/Server', description: 'Configure Apollo GraphQL client and service definitions', href: 'https://www.apollographql.com/docs/devtools/apollo-config/' }],
  },
};
