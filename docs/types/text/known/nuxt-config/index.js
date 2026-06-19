export default {
  id: 'nuxt-config',
  label: 'Nuxt Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^nuxt\.config\.(ts|js|mjs)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Nuxt 3 configuration — defines modules, plugins, SSR mode, router, and dev server settings.' },
};
