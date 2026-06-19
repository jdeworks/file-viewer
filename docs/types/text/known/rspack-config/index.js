export default {
  id: 'rspack-config',
  label: 'Rspack Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'rspack.config.js' || n === 'rspack.config.ts' || n === 'rspack.config.mjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Rspack bundler configuration — a Rust-powered webpack-compatible bundler; defines entry, output, loaders, plugins, and mode.' },
};
