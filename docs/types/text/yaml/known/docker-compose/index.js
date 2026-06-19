// docker-compose.yml enhancement: a card per service with its image/build, ports, dependencies
// and volumes — a quick overview of the stack.
export default {
  id: 'docker-compose',
  label: 'docker-compose',
  match: (intake, baseType) => (baseType.id === 'yaml' || baseType.id === 'docker-compose') && /(^|\/)(docker-)?compose(\.\w+)?\.ya?ml$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
