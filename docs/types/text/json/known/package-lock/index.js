// package-lock.json enhancement: show lockfile version badge, total dependency count,
// direct vs transitive breakdown. Handles lockfileVersion 1, 2, and 3.
export default {
  id: 'package-lock',
  label: 'package-lock.json',
  match: (intake, baseType) => baseType.id === 'json' && /(^|\/)package-lock\.json$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
};
