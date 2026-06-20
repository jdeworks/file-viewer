export const plugin = {
  id: 'eslintignore',
  label: '.eslintignore',
  tags: ['eslint', 'javascript', 'linting'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.eslintignore';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
export default plugin;
