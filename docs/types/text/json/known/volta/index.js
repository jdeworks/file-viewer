export default {
  id: 'volta',
  label: 'Volta pins',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'volta.json' || (name === 'package.json' && (intake.text || '').includes('"volta"'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Volta tool pinning configuration — shows pinned Node, npm, and yarn versions.' },
};
