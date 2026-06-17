// .gitignore enhancement: group patterns under their comment headers and annotate each
// (negation, directory-only, anchored, wildcard) so a long ignore file is scannable.
export default {
  id: 'gitignore',
  label: '.gitignore',
  match: (intake) => /(^|\/)\.gitignore$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
