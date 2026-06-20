export default {
  id: 'mako-conf',
  label: 'mako Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'makorc') return true;
    if (n === 'mako') return true;
    // mako config has specific keys
    const text = intake.textSample || intake.text || '';
    if (text.includes('default-timeout=') && text.includes('background-color=') && !text.includes('[server]')) return true;
    if ((text.includes('max-visible=') && text.includes('sort=-time')) || (text.includes('anchor=') && text.includes('border-color='))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'mako Wayland notification daemon configuration — appearance, timeout, and criteria.',
    tags: ['mako', 'notification', 'wayland', 'config'],
  },
};
