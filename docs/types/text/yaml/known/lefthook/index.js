export default {
  id: 'lefthook',
  label: 'Lefthook config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['lefthook.yml', 'lefthook.yaml', '.lefthook.yml', '.lefthook.yaml'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Lefthook Git hooks manager configuration — defines commands to run at git hook stages like pre-commit and commit-msg.',
    usedFor: [{ label: 'Git hooks', description: 'Fast and powerful Git hooks manager for Node.js, Ruby, or any other type of projects', href: 'https://evilmartians.com/products/lefthook' }],
  },
};
