export default {
  id: 'vite-config',
  label: 'Vite Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^vite\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Vite build tool configuration — defines plugins, server options, build targets, and bundler behavior.' },
};
