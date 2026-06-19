export default {
  id: 'mypy',
  label: 'mypy.ini',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'mypy.ini' || name === '.mypy.ini';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'mypy.ini — mypy static type checker configuration for Python, including strict mode and per-module overrides.',
    usedFor: [{ label: 'Python type checking', description: 'Optional static type checking for Python with mypy', href: 'https://mypy.readthedocs.io/en/stable/config_file.html' }],
  },
};
