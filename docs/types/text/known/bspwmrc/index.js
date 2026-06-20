export default {
  id: 'bspwmrc',
  label: 'bspwm Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'bspwmrc') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('bspc monitor') || text.includes('bspc config') || text.includes('bspc rule')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'bspwm binary space partitioning window manager configuration script.',
    tags: ['bspwm', 'wm', 'tiling', 'x11', 'config'],
  },
};
