export default {
  id: 'screenrc',
  label: 'GNU Screen Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === '.screenrc' || n === 'screenrc' || n === '.screen') return true;
    if ((text.includes('startup_message') || text.includes('defscrollback') || text.includes('termcapinfo')) &&
        text.includes('escape ')) return true;
    if (text.includes('hardstatus') && text.includes('caption')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GNU Screen configuration — defines the escape key, scrollback buffer, status line, and keybindings for the Screen terminal multiplexer.',
    usedFor: [{ label: 'GNU Screen', description: 'Terminal multiplexer allowing multiple virtual terminals in a single session', href: 'https://www.gnu.org/software/screen/' }],
  },
};
