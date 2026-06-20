export const plugin = {
  id: 'prettierignore',
  label: '.prettierignore',
  tags: ['prettier', 'javascript', 'formatting'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.prettierignore';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
export default plugin;
