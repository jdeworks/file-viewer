export default {
  id: 'knip',
  label: 'Knip config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'knip.json' || name === '.knip.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Knip dead code and unused dependency finder configuration' },
};
