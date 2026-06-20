// .npmignore enhancement: like .gitignore but controls what npm publish excludes.
// Shows categorized rules grouped by comment headers.
export default {
  id: 'npmignore',
  label: '.npmignore',
  match: (intake) => /(^|\/)\.npmignore$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
