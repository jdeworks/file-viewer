export const plugin = {
  id: 'mailmap',
  label: '.mailmap',
  tags: ['git', 'mailmap', 'authors'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.mailmap';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
export default plugin;
