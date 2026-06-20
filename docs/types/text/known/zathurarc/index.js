export default {
  id: 'zathurarc',
  label: 'Zathura Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'zathurarc') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('set recolor') || text.includes('set adjust-open')) return true;
    if (text.includes('set statusbar-h-padding') && text.includes('set default-bg')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Zathura PDF and document viewer configuration — colors, recolor mode, and key bindings.',
    tags: ['zathura', 'pdf', 'viewer', 'config'],
  },
};
