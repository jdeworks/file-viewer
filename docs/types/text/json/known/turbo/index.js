export default {
  id: 'turbo',
  label: 'Turborepo config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'turbo.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Turborepo build system configuration — defines tasks, caching, and pipeline dependencies for monorepos.',
    usedFor: [{ label: 'Monorepo builds', description: 'High-performance build system for JavaScript/TypeScript monorepos', href: 'https://turbo.build/repo/docs/reference/configuration' }],
  },
};
