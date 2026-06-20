export const plugin = {
  id: 'pytest-ini',
  label: 'pytest Config',
  tags: ['pytest', 'python', 'testing'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'pytest.ini') return true;
    // setup.cfg is handled by the setup-cfg plugin — it covers pytest config within it
    if (n === 'setup.cfg') return false;
    const t = intake.text || '';
    return /^\[pytest\]/m.test(t) || /^\[tool:pytest\]/m.test(t);
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'pytest.ini — pytest configuration: test paths, markers, addopts, coverage thresholds, and warning filters.',
    usedFor: [{ label: 'pytest', description: 'Python testing framework configuration', href: 'https://docs.pytest.org/en/stable/reference/customize.html' }],
  },
};
export default plugin;
