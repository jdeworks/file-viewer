export default {
  id: 'amplify',
  label: 'AWS Amplify config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'amplify.yml' || name === 'amplify.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS Amplify build specification — defines preBuild, build, and postBuild phases.',
    usedFor: [{ label: 'AWS hosting', description: 'Fullstack CI/CD with AWS Amplify Hosting', href: 'https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html' }],
  },
};
