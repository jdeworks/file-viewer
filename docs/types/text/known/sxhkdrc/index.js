export default {
  id: 'sxhkdrc',
  label: 'sxhkd Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'sxhkdrc') return true;
    const text = intake.textSample || intake.text || '';
    // sxhkd: key line (no leading space) + command (with leading space/tab)
    if (text.match(/^super \+ \w/m) && text.match(/^\s+\w/m)) return true;
    if (text.includes('super + {') && text.match(/^\s+bspc /m)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'sxhkd simple X hotkey daemon configuration — keyboard shortcut bindings.',
    tags: ['sxhkd', 'hotkeys', 'keybindings', 'x11', 'bspwm', 'config'],
  },
};
