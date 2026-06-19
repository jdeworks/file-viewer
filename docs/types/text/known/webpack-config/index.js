export default {
  id: 'webpack-config',
  label: 'Webpack Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^webpack\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Webpack bundler configuration — defines entry points, output, loaders, plugins, and optimization settings.' },
};
