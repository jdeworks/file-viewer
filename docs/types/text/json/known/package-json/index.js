// package.json enhancement: a normal JSON file, but we know its schema — so we render a
// summary with links to npm for each dependency, the scripts, and repo/homepage links.
export default {
  id: 'package-json',
  label: 'package.json',
  match: (intake, baseType) => baseType.id === 'json' && /(^|\/)package\.json$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
