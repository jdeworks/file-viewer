export default {
  id: 'angular',
  label: 'Angular workspace',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'angular.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Angular CLI workspace configuration' },
};
