export const plugin = {
  id: 'zsh-script',
  label: 'Zsh Script',
  tags: ['zsh', 'shell', 'script', 'z-shell'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // .zsh extension — but NOT rc/config files (handled by shell-rc)
    if (name.endsWith('.zsh') && !name.endsWith('rc')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Zsh (Z Shell) script file. .zsh scripts define functions, autoloads, completions, keybindings, and zstyle settings for the Zsh environment.',
    usedFor: [
      { label: 'Zsh', description: 'Z Shell — extended Bourne shell', href: 'https://www.zsh.org/' },
      { label: 'Oh My Zsh', description: 'Zsh configuration framework', href: 'https://ohmyz.sh/' },
    ],
  },
};
export default plugin;
