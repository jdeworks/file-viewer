export default {
  id: 'picom-conf',
  label: 'picom Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'picom.conf' || n === 'compton.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('shadow-radius') && text.includes('backend')) return true;
    if (text.includes('corner-radius') && (text.includes('blur-method') || text.includes('shadow-offset'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'picom X11 compositor configuration — shadows, blur, opacity, fading, and animations.',
    tags: ['picom', 'compositor', 'x11', 'config'],
  },
};
