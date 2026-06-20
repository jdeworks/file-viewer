export const plugin = {
  id: 'prefect-config',
  label: 'Prefect Config',
  tags: ['prefect', 'workflow', 'orchestration', 'devops', 'yaml'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'prefect.yaml' || n === 'prefect.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prefect 2 workflow orchestration configuration — project, deployments, work pools, schedules, build/pull/push steps.',
    usedFor: [{ label: 'Prefect 2', description: 'Modern workflow orchestration platform for data and ML pipelines', href: 'https://docs.prefect.io/' }],
  },
};
export default plugin;
