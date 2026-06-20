export const plugin = {
  id: 'editorconfig',
  label: '.editorconfig',
  tags: ['editorconfig', 'editor', 'formatting'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.editorconfig';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
};
export default plugin;
