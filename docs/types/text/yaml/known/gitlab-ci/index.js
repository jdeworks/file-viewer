export default {
  id: 'gitlab-ci',
  label: 'GitLab CI',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.gitlab-ci.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'GitLab CI/CD pipeline configuration' },
};
