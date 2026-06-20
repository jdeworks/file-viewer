export default {
  id: 'alacritty-conf',
  label: 'Alacritty Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'alacritty.toml' || n === 'alacritty.yml' || n === 'alacritty.yaml') return true;
    if (text.includes('[font]') && text.includes('[window]') && (text.includes('[colors]') || text.includes('[env]'))) return true;
    if (text.includes('font:') && text.includes('window:') && text.includes('colors:') && text.includes('normal:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Alacritty terminal emulator configuration — controls font, window decorations, colors, scrolling, and keyboard bindings.',
    usedFor: [{ label: 'Alacritty', description: 'GPU-accelerated terminal emulator focused on simplicity and performance', href: 'https://alacritty.org/' }],
  },
};
