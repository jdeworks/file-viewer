export default {
  id: 'moonrepo',
  label: 'Moon (Moonrepo)',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml' && baseType.id !== 'docker-compose') return false;
    const path = (intake.filename || '').replace(/\\/g, '/');
    // NOTE: bare "moon.yml" (per-project config) is intentionally NOT matched here —
    // it's handled by the dedicated moon-yml plugin (docs/types/text/yaml/known/moon),
    // which is registered later in docs/known/registry.js and would otherwise be
    // permanently shadowed by this plugin's broader match.
    return path.endsWith('.moon/workspace.yml') ||
           path.endsWith('.moon/toolchain.yml');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Moon (Moonrepo) configuration — a fast, reliable build system and monorepo management tool for JavaScript/TypeScript projects. Handles task orchestration, caching, and workspace configuration.',
    usedFor: [{ label: 'Build system', description: 'Moon build system and monorepo management for JS/TS projects', href: 'https://moonrepo.dev/' }],
  },
};
