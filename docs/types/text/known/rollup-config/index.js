export default {
  id: 'rollup-config',
  label: 'Rollup Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^rollup\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Rollup module bundler configuration — defines input, output format, plugins, and tree-shaking behavior.' },
};
