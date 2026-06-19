export default {
  id: 'bitbucket-pipelines',
  label: 'Bitbucket Pipelines',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop();
    return name === 'bitbucket-pipelines.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Bitbucket Pipelines config — shows Docker image, pipeline steps, and branch/PR trigger structure.',
    usedFor: [{ label: 'CI/CD automation', description: 'Define automated build and deploy pipelines for Bitbucket repositories.', href: 'https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/' }],
  },
};
