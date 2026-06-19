export default {
  id: 'python-version',
  label: '.python-version',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.python-version';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.python-version — pins one or more Python versions for pyenv (one per line). The first entry is the default active version.',
    usedFor: [
      { label: 'Python version pin', description: 'pyenv reads this file to auto-switch Python versions in the directory', href: 'https://github.com/pyenv/pyenv#readme' },
    ],
  },
};
