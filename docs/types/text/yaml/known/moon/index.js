export const plugin = {
  id: 'moon-yml',
  label: 'Moon',
  tags: ['moon', 'monorepo', 'build', 'yaml'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'moon.yml';
  },
  renderer: () => import('./renderer.js'),
  // Legacy alias for registry compatibility
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Moonrepo project configuration — defines tasks, language, dependencies, and project metadata for a monorepo project.',
    usedFor: [{ label: 'Moonrepo', description: 'Powerful monorepo management and task runner', href: 'https://moonrepo.dev/docs/config/project' }],
  },
};

export default plugin;
