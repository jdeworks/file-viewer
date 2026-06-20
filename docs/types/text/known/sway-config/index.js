export default {
  id: 'sway-config',
  label: 'Sway Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'sway' || n === 'sway.conf') return true;
    if (n === 'config') {
      if (text.includes('# sway') || (text.includes('output ') && text.includes('resolution') && text.includes('bindsym'))) return true;
      if (text.includes('set $mod') && text.includes('input ') && text.includes('bindsym') && text.includes('swaymsg')) return true;
    }
    if (text.includes('output * bg ') || text.includes('swaymsg') || text.includes('swaylock') || text.includes('swaybar')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Sway tiling Wayland compositor configuration — defines keybindings, outputs, inputs, workspaces, and startup applications for the i3-compatible Wayland compositor.',
    usedFor: [{ label: 'Sway', description: 'i3-compatible tiling Wayland compositor', href: 'https://swaywm.org/' }],
  },
};
