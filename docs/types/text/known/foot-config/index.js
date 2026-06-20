export default {
  id: 'foot-config',
  label: 'foot Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'foot.ini' || n === 'foot.conf' || n === 'footrc') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('[foot]') && text.includes('font=')) return true;
    if (text.includes('[colors]') && text.includes('alpha=') && (text.includes('[main]') || text.includes('[cursor]'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'foot Wayland terminal emulator configuration — font, colors, key bindings, and scroll settings.',
    tags: ['terminal', 'foot', 'wayland', 'config'],
  },
};
