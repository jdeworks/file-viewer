export const plugin = {
  id: 'gcloudignore',
  label: '.gcloudignore',
  tags: ['gcloud', 'google-cloud', 'deploy'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.gcloudignore';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
export default plugin;
