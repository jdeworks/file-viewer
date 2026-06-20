export default {
  id: 'devcontainer',
  label: 'Dev Container',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'devcontainer.json' || name === '.devcontainer.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'VS Code / GitHub Codespaces development container configuration' },
};
