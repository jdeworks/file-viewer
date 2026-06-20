export const plugin = {
  id: 'babelrc',
  label: '.babelrc',
  tags: ['babel', 'javascript', 'transpiler'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.babelrc' || n === '.babelrc.json';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.babelrc — Babel JavaScript compiler configuration: defines presets, plugins, and environment-specific transpilation overrides.',
    usedFor: [{ label: 'JS transpilation', description: 'Per-project Babel config in JSON format, scoped to its file location', href: 'https://babeljs.io/docs/configuration' }],
  },
};
export default plugin;
