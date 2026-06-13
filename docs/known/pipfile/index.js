// Pipfile enhancement (Python/pipenv): list [packages] and [dev-packages] with PyPI links, plus
// the required Python version. A TOML file with a schema we understand.
export default {
  id: 'pipfile',
  label: 'Pipfile',
  match: (intake) => /(^|\/)Pipfile$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
};
