export default {
  id: 'hyprland-conf',
  label: 'Hyprland Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'hyprland.conf' || n === 'hypr.conf') return true;
    if (text.includes('$mainMod') && (text.includes('bind = ') || text.includes('bindm = '))) return true;
    if (text.includes('monitor=') && text.includes('general {') && text.includes('decoration {')) return true;
    if (text.includes('exec-once') && (text.includes('waybar') || text.includes('hyprpaper') || text.includes('hyprlock'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Hyprland dynamic tiling Wayland compositor configuration — defines monitors, keybindings, animations, window rules, and startup applications.',
    usedFor: [{ label: 'Hyprland', description: 'Highly customizable dynamic tiling Wayland compositor', href: 'https://wiki.hyprland.org/Configuring/Configuring-Hyprland/' }],
  },
};
