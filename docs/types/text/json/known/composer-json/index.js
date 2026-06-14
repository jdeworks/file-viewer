// composer.json enhancement (PHP): like package.json, but we link each dependency to its
// Packagist page. A normal JSON file with a schema we understand.
export default {
  id: 'composer-json',
  label: 'composer.json',
  match: (intake, baseType) => baseType.id === 'json' && /(^|\/)composer\.json$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
};
