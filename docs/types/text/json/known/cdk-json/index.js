export default {
  id: 'cdk-json',
  label: 'AWS CDK',
  match: (intake, baseType) => {
    if (baseType?.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'cdk.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS CDK app configuration — defines the CDK app entry point, context, and toolkit settings.',
    usedFor: [{ label: 'AWS CDK', description: 'Cloud Development Kit for defining cloud infrastructure in code.', href: 'https://docs.aws.amazon.com/cdk/' }],
  },
};
