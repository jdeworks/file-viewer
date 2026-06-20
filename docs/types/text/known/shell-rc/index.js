export default {
  id: 'shell-rc',
  label: 'Shell config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return ['.bashrc', '.zshrc', '.bash_profile', '.bash_aliases', '.profile', '.zprofile', '.zshenv', '.kshrc', '.tcshrc'].includes(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Shell configuration file — aliases, functions, exports, and PATH modifications for interactive shell sessions.',
    usedFor: [{ label: 'Shell config', description: 'Bash/Zsh/Ksh/Tcsh configuration', href: 'https://www.gnu.org/software/bash/manual/bash.html' }],
  },
};
