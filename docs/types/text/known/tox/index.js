export default {
  id: 'tox',
  label: 'tox.ini',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'tox.ini';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'tox.ini — Python test automation: defines test environments, dependencies, and commands across multiple Python versions.',
    usedFor: [{ label: 'Python testing', description: 'Run tests in isolated environments across Python versions', href: 'https://tox.wiki' }],
  },
};
