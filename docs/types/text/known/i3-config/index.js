export default {
  id: 'i3-config',
  label: 'i3 Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Sway-specific content takes priority — don't claim sway configs
    if (text.includes('output * bg ') || text.includes('swaymsg') || text.includes('swaylock') || text.includes('swaybar')) return false;
    // i3 config files: ~/.config/i3/config or ~/.i3/config
    if (n === 'config' || n === 'i3.conf') {
      if (text.includes('# i3') || (text.includes('set $mod') && text.includes('bindsym')) ||
          (text.includes('workspace') && text.includes('bindsym') && text.includes('exec'))) return true;
    }
    if (text.includes('set $mod Mod') && text.includes('bindsym $mod') && text.includes('font pango:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'i3 tiling window manager configuration — defines keybindings, workspaces, layouts, colors, and startup applications.',
    usedFor: [{ label: 'i3', description: 'Improved tiling window manager for X11', href: 'https://i3wm.org/docs/userguide.html' }],
  },
};
