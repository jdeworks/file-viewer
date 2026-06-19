// poetry.lock enhancement: show total package count, Python version constraints, package sample.
// poetry.lock is TOML format.
export default {
  id: 'poetry-lock',
  label: 'poetry.lock',
  match: (intake, baseType) => baseType.id === 'toml' && /(^|\/)poetry\.lock$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
};
