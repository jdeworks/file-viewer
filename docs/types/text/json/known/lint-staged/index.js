export default {
  id: 'lint-staged',
  label: 'lint-staged Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.lintstagedrc.json' || name === 'lint-staged.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'lint-staged configuration — glob patterns mapped to commands run on staged files.' },
};
