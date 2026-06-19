export default {
  id: 'serverless',
  label: 'Serverless Framework config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['serverless.yml', 'serverless.yaml'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Serverless Framework configuration — defines cloud functions, providers, events, and infrastructure as code.',
    usedFor: [{ label: 'Serverless deployment', description: 'Deploy cloud functions to AWS Lambda, Azure Functions, Google Cloud, and more', href: 'https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml' }],
  },
};
