export default {
  id: 'bandit-yaml',
  label: 'Bandit config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.bandit' || n === 'bandit.yaml' || n === 'bandit.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Bandit security linter configuration — skipped test IDs, excluded directories, severity and confidence filters.',
    usedFor: [{ label: 'Bandit', description: 'Security linting tool for Python code', href: 'https://bandit.readthedocs.io/en/latest/config.html' }],
  },
};
