// Emacs config enhancement: surfaces package manager, packages, custom vars, and keybindings.
export default {
  id: 'emacs-config',
  label: 'Emacs Config',
  match: (intake) => {
    const name = (intake.filename || '').replace(/^.*[\\/]/, '');
    return name === '.emacs' || name === 'init.el';
  },
  loadRenderer: () => import('./renderer.js'),
};
