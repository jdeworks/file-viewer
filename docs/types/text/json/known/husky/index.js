export default {
  id: 'husky',
  label: 'Husky Git Hooks',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.huskyrc.json' || name === 'huskyrc.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Husky git hooks configuration — pre-commit, commit-msg, pre-push and other hooks.' },
};
