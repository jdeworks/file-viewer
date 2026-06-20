export default {
  id: 'cfn-template',
  label: 'CloudFormation',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    if (!['template.yaml', 'template.yml', 'cloudformation.yml', 'cloudformation.yaml'].includes(name)) return false;
    const t = intake.text || '';
    return t.includes('AWSTemplateFormatVersion') || t.includes('AWS::');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS CloudFormation template — defines infrastructure resources to provision and manage.',
    usedFor: [{ label: 'AWS CloudFormation', description: 'Infrastructure as Code for AWS resources.', href: 'https://docs.aws.amazon.com/cloudformation/' }],
  },
};
