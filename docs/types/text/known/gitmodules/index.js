export default {
  id: 'gitmodules',
  label: '.gitmodules (submodules)',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === '.gitmodules';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: '.gitmodules file — declares Git submodule paths and remote URLs.' },
};
