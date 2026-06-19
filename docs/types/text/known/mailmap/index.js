// .mailmap enhancement: Git author name/email canonicalization file.
// Shows a table of canonical identity → old identity mappings.
export default {
  id: 'mailmap',
  label: '.mailmap',
  match: (intake) => /(^|\/)\.mailmap$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
