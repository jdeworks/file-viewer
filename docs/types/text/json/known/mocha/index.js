export default {
  id: 'mocha',
  label: 'Mocha config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.mocharc.json' || name === '.mocharc.cjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Mocha JavaScript test runner configuration' },
};
