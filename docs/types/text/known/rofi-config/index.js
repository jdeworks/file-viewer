export default {
  id: 'rofi-config',
  label: 'Rofi Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'config.rasi' || n.endsWith('.rasi')) return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('configuration {') && text.includes('modi:')) return true;
    if (text.includes('* {') && text.includes('background-color:') && text.includes('text-color:') && n.endsWith('.rasi')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Rofi window switcher, application launcher, and dmenu replacement configuration.',
    tags: ['rofi', 'launcher', 'wayland', 'x11', 'config'],
  },
};
