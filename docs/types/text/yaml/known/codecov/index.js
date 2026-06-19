export default {
  id: 'codecov',
  label: 'Codecov config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['codecov.yml', 'codecov.yaml', '.codecov.yml'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Codecov CI coverage configuration — sets coverage targets, flags, ignore paths, and PR comment behavior.',
    usedFor: [{ label: 'Coverage reporting', description: 'Code coverage reporting and enforcement for CI/CD', href: 'https://docs.codecov.com/docs/codecovyml-reference' }],
  },
};
