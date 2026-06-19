export default {
  id: 'heroku',
  label: 'Heroku config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'heroku.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Heroku deployment configuration — defines Docker images, release commands, and process types for Heroku apps.',
    usedFor: [{ label: 'PaaS deployment', description: 'Deploy containerized apps to Heroku', href: 'https://devcenter.heroku.com/articles/build-docker-images-heroku-yml' }],
  },
};
