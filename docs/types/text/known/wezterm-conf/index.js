export default {
  id: 'wezterm-conf',
  label: 'WezTerm Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.wezterm.lua' || n === 'wezterm.lua') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('wezterm.action') || text.includes('wezterm.font')) return true;
    if (text.includes("require('wezterm')") || text.includes('require("wezterm")')) return true;
    if (text.includes('config.font') && text.includes('config.color_scheme') && text.includes('wezterm')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'WezTerm GPU-accelerated terminal emulator Lua configuration — fonts, colors, keybindings, and multiplexing.',
    tags: ['terminal', 'wezterm', 'lua', 'config', 'gpu'],
  },
};
