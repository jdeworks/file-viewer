export default {
  id: 'pixi-config',
  label: 'pixi project',
  match: (intake, baseType) => baseType && baseType.id === 'toml' && (intake.filename || '').split('/').pop().toLowerCase() === 'pixi.toml',
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'pixi project configuration — conda/PyPI dependencies, tasks, platforms, and channels.' },
};
