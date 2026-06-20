export default {
  id: 'setup-cfg',
  label: 'setup.cfg',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'setup.cfg';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Python package configuration — metadata, dependencies, tool settings for pytest, mypy, flake8, and more.',
    usedFor: [{ label: 'setuptools', description: 'Python package build and distribution configuration', href: 'https://setuptools.pypa.io/en/latest/userguide/declarative_config.html' }],
  },
};
