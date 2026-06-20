export default {
  id: 'sonar',
  label: 'SonarQube config',
  match: (intake) => {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'sonar-project.properties') return true;
    const t = intake.text || '';
    return t.startsWith('sonar.projectKey=') || t.includes('sonar.host.url=');
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'SonarQube project configuration — project key, sources, exclusions, and analysis settings.' },
};
