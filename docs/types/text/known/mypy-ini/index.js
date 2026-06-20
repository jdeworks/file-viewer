export default {
  id: 'mypy-ini',
  label: 'mypy config',
  match: (intake) => {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'mypy.ini' || name === '.mypy.ini') return true;
    // heuristic: plain text containing [mypy] section header
    const text = intake.text || '';
    return /^\[mypy\]/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'mypy.ini — mypy static type checker configuration for Python, including strictness flags and per-module overrides.',
    usedFor: [{ label: 'Python type checking', description: 'Optional static type checking for Python with mypy.', href: 'https://mypy.readthedocs.io/en/stable/config_file.html' }],
  },
};
