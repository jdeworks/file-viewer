export default {
  id: 'kitty-conf',
  label: 'kitty Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'kitty.conf') return true;
    if (text.includes('font_family ') && text.includes('font_size ') && (text.includes('map ') || text.includes('background '))) return true;
    if (text.includes('# vim: ft=kitty') || text.includes('begin_kitty_theme') || text.includes('# kitty color scheme')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'kitty terminal emulator configuration — controls fonts, colors, window layout, keyboard shortcuts, and tab behavior.',
    usedFor: [{ label: 'kitty', description: 'Fast, feature-rich, GPU based terminal emulator', href: 'https://sw.kovidgoyal.net/kitty/conf/' }],
  },
};
