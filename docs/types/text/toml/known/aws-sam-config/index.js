export default {
  id: 'aws-sam-config',
  label: 'SAM Config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'toml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'samconfig.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS SAM CLI configuration file — stores deployment parameters for SAM CLI commands.',
    usedFor: [{ label: 'AWS SAM CLI', description: 'SAM CLI samconfig.toml stores per-environment deploy parameters.', href: 'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html' }],
  },
};
