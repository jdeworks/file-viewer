export default {
  id: 'sam-template',
  label: 'AWS SAM',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    if (name !== 'template.yaml' && name !== 'template.yml' && name !== 'sam-template.yaml' && name !== 'sam-template.yml') return false;
    const t = intake.text || '';
    return t.includes('AWS::Serverless');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS Serverless Application Model template — defines serverless functions, APIs, and event sources.',
    usedFor: [{ label: 'AWS SAM', description: 'Framework for building serverless applications on AWS.', href: 'https://docs.aws.amazon.com/serverless-application-model/' }],
  },
};
