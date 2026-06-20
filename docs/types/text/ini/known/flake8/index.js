export default {
  id: 'flake8',
  label: 'Flake8 config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.flake8';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Flake8 style and lint configuration — max line length, complexity threshold, ignored error codes, and per-file exclusions.',
    usedFor: [{ label: 'Flake8', description: 'Python style guide enforcement and lint tool', href: 'https://flake8.pycqa.org/en/latest/user/configuration.html' }],
  },
};
