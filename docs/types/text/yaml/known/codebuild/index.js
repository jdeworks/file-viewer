export default {
  id: 'codebuild',
  label: 'AWS CodeBuild buildspec',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'buildspec.yml' || name === 'buildspec.yaml' || /^buildspec\..+\.ya?ml$/.test(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS CodeBuild buildspec — defines install, pre_build, build, and post_build phases.',
    usedFor: [{ label: 'AWS CI/CD', description: 'Build and test with AWS CodeBuild', href: 'https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html' }],
  },
};
