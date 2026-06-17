// requirements.txt enhancement: list each pinned Python dependency with its version constraint
// and a link to its PyPI page. Comments, options (-r/-e/--hash) and blank lines are summarized.
export default {
  id: 'requirements-txt',
  label: 'requirements.txt',
  match: (intake) => /(^|\/)(requirements[\w.-]*|constraints)\.txt$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
