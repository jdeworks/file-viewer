export const plugin = {
  id: 'semaphore-ci',
  label: 'Semaphore CI',
  tags: ['semaphore', 'ci', 'yaml'],
  match(intake, baseType) {
    if (baseType && baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const path = (intake.name || intake.filename || '').toLowerCase();
    if (n !== 'semaphore.yml' && n !== 'semaphore.yaml') return false;
    const text = intake.text || '';
    return path.includes('.semaphore') || text.includes('version: v1.0') || (text.includes('blocks:') && text.includes('agent:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Semaphore CI pipeline — shows agent, blocks, jobs, global config, and promotions.',
    usedFor: [{ label: 'Semaphore CI', description: 'Fast and flexible CI/CD platform', href: 'https://docs.semaphoreci.com/reference/pipeline-yaml-reference/' }],
  },
};
export default plugin;
