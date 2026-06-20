export default {
  id: 'cmus-conf',
  label: 'cmus Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'rc' || n === 'cmusrc') {
      const text = intake.textSample || intake.text || '';
      if (text.includes('set color_') || text.includes('set output_plugin') || text.includes('bind -f')) return true;
      if (text.includes('colorscheme ') && text.includes('set show_hidden')) return true;
    }
    if (n === 'cmus.conf') return true;
    if (n === 'cmus.rc') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'cmus terminal music player configuration — output plugin, colors, key bindings, and library settings.',
    tags: ['cmus', 'music', 'audio', 'terminal', 'config'],
  },
};
