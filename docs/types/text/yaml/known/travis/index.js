export default {
  id: 'travis',
  label: 'Travis CI config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.travis.yml' || name === 'travis.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Travis CI configuration — shows language, build matrix, stages, and branch triggers.',
    usedFor: [{ label: 'CI/CD', description: 'Continuous integration with Travis CI', href: 'https://docs.travis-ci.com/user/travis-yml-overview/' }],
  },
};
