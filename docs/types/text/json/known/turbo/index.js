export const plugin = {
  id: 'turbo-json',
  label: 'Turborepo',
  tags: ['turborepo', 'monorepo', 'build'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'turbo.json';
  },
  renderer: () => import('./renderer.js'),
  // Legacy aliases for registry compatibility
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Turborepo build system configuration — defines tasks, caching, and pipeline dependencies for monorepos.',
    usedFor: [{ label: 'Monorepo builds', description: 'High-performance build system for JavaScript/TypeScript monorepos', href: 'https://turbo.build/repo/docs/reference/configuration' }],
  },
};

export default plugin;
