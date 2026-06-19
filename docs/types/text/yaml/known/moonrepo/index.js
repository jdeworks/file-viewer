export default {
  id: 'moonrepo',
  label: 'Moon (Moonrepo)',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml' && baseType.id !== 'docker-compose') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    const path = (intake.filename || '').replace(/\\/g, '/');
    return name === 'moon.yml' ||
           path.endsWith('.moon/workspace.yml') ||
           path.endsWith('.moon/toolchain.yml');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Moon (Moonrepo) configuration — a fast, reliable build system and monorepo management tool for JavaScript/TypeScript projects. Handles task orchestration, caching, and workspace configuration.',
    usedFor: [{ label: 'Build system', description: 'Moon build system and monorepo management for JS/TS projects', href: 'https://moonrepo.dev/' }],
  },
};
