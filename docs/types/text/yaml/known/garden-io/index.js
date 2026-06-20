export const plugin = {
  id: 'garden-io',
  label: 'Garden.io config',
  tags: ['garden', 'devops', 'orchestration', 'kubernetes'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'garden.yml' || n === 'garden.yaml') return true;
    const t = intake.text || '';
    // Garden files have a 'kind' field and are either project or module definitions
    return /^kind:\s*(Project|Module|Deploy|Build|Run|Test|Workflow)/m.test(t) &&
      /^apiVersion:\s*garden\.io/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Garden.io development orchestration configuration — project, module, service, task, and test definitions.',
    usedFor: [{ label: 'Dev orchestration', description: 'Garden automates building, testing, and deploying across microservices with a unified config.', href: 'https://garden.io/' }],
  },
};
export default plugin;
