// .dockerignore enhancement: Docker build context exclusions.
// Shows a structured list with categories based on common patterns.
export default {
  id: 'dockerignore',
  label: '.dockerignore',
  match: (intake) => /(^|\/)\.dockerignore$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
