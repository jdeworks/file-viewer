export default {
  id: 'appveyor',
  label: 'AppVeyor CI config',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'appveyor.yml' || name === '.appveyor.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AppVeyor CI configuration — shows build image, scripts, branch filters, environment variables, and artifacts.',
    usedFor: [{ label: 'CI/CD', description: 'Continuous integration with AppVeyor', href: 'https://www.appveyor.com/docs/appveyor-yml/' }],
  },
};
