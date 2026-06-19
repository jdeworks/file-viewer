export default {
  id: 'rush',
  label: 'Rush monorepo config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'rush.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Rush monorepo configuration — Microsoft Rush Stack tool for managing large-scale JavaScript/TypeScript monorepos with fast, parallelized builds and fine-grained dependency management.',
    usedFor: [{ label: 'Monorepo management', description: 'Enterprise-scale JavaScript/TypeScript monorepo orchestration', href: 'https://rushjs.io/' }],
  },
};
