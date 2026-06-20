export default {
  id: 'xresources',
  label: 'Xresources',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.xresources' || n === 'xresources' || n === '.xdefaults' || n === 'xdefaults') return true;
    const text = intake.textSample || intake.text || '';
    // Xresources: lines like "App.key: value" or "*key: value" or "Xft.dpi: 96"
    if (text.includes('Xft.dpi') || text.includes('Xft.antialias')) return true;
    if (text.match(/^[A-Z*][A-Za-z*]+\.[A-Za-z]+:/m) && text.includes('color')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'X11 .Xresources resource database — terminal colors, fonts, DPI, and application settings.',
    tags: ['x11', 'xresources', 'xdefaults', 'terminal', 'colors', 'config'],
  },
};
