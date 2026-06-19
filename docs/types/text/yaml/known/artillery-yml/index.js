export default {
  id: 'artillery-yml',
  label: 'Artillery Config',
  match(intake, baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return (baseType.id === 'yaml') && (n === 'artillery.yml' || n === 'artillery.yaml' || n === '.artillery.yml');
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Artillery load testing configuration — defines target URL, load phases (arrival rates / ramp-up), and scenario flows.' },
};
