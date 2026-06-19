export default {
  id: 'mise-config',
  label: 'mise config',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'mise.toml' || name === '.mise.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'mise (formerly rtx) tool version manager config — tools, tasks, and environment.' },
};
