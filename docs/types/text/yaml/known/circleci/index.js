export const plugin = {
  id: 'circleci-config',
  label: 'CircleCI Config',
  tags: ['circleci', 'ci', 'yaml'],
  match(intake, baseType) {
    if (baseType && baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const path = (intake.name || intake.filename || '').toLowerCase();
    if (n === 'config.yml' && path.includes('.circleci')) return true;
    if (['.circleci.yml', 'circleci.yml', 'circleci-config.yml'].includes(n)) return true;
    const text = intake.textSample || intake.text || '';
    return n === 'config.yml' && text.includes('version:') && (text.includes('orbs:') || (text.includes('jobs:') && text.includes('workflows:')));
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CircleCI configuration — shows version, orbs, workflows, and jobs overview.',
    usedFor: [{ label: 'CI/CD', description: 'Cloud-native continuous integration with CircleCI', href: 'https://circleci.com/docs/configuration-reference/' }],
  },
};
export default plugin;
