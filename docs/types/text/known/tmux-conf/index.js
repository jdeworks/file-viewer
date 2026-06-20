export default {
  id: 'tmux-conf',
  label: 'tmux Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === '.tmux.conf' || n === 'tmux.conf') return true;
    if (text.includes('set -g prefix') || text.includes('set-option -g prefix') || text.includes('bind-key') && text.includes('send-prefix')) return true;
    if (text.includes('set -g status-') && text.includes('bind ')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'tmux terminal multiplexer configuration — defines keybindings, status bar, colors, and session behavior.',
    usedFor: [{ label: 'tmux', description: 'Terminal multiplexer — multiple windows and panes in a single terminal', href: 'https://github.com/tmux/tmux/wiki' }],
  },
};
