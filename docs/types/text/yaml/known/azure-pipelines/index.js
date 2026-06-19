export default {
  id: 'azure-pipelines',
  label: 'Azure Pipelines config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['azure-pipelines.yml', 'azure-pipelines.yaml'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Azure DevOps Pipelines configuration — defines CI/CD stages, jobs, steps, triggers, and pool settings.',
    usedFor: [{ label: 'Azure CI/CD', description: 'Build, test, and deploy with Azure DevOps Pipelines', href: 'https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema' }],
  },
};
