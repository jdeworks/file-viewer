export default {
  id: 'sonar',
  label: 'SonarQube config',
  match: (intake) => (intake.filename || '').split('/').pop() === 'sonar-project.properties',
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'SonarQube project configuration — project key, sources, exclusions, and analysis settings.' },
};
