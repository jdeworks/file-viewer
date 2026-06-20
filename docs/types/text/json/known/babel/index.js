export default {
  id: 'babel',
  label: 'Babel config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return ['babel.config.json', '.babelrc', '.babelrc.json'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Babel JavaScript compiler configuration — defines presets and plugins for transpiling modern JS/TS syntax.',
    usedFor: [{ label: 'JS transpilation', description: 'Toolchain for converting ECMAScript 2015+ code into a backwards compatible version', href: 'https://babeljs.io/docs/configuration' }],
  },
};
