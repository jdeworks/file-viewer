export default {
  id: 'waybar-config',
  label: 'Waybar Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const validName = n === 'config' || n === 'config.jsonc' || n === 'config.json' || n === 'waybar-config.json' || n === 'waybar.config.json';
    if (!validName) return false;
    const text = intake.text || '';
    return text.includes('"modules-left"') || text.includes('"modules-center"') || text.includes('"modules-right"');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Waybar status bar configuration — module layout, display settings, and per-module options.',
    usedFor: [{ label: 'Waybar', description: 'Highly customizable Wayland bar for Sway and wlroots-based compositors', href: 'https://github.com/Alexays/Waybar' }],
  },
};
