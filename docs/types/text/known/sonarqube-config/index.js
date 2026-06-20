export default {
  id: 'sonarqube-config',
  label: 'SonarQube Server Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'sonar.properties' || n === 'sonarqube.properties';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SonarQube code quality server configuration — web host, database connection, Elasticsearch, authentication, and logging settings.',
    tags: ['sonarqube', 'code-quality', 'static-analysis', 'devops', 'config'],
  },
};
