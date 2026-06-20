export default {
  id: 'lfrc',
  label: 'lf Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'lfrc') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('set icons') || text.includes('set previewer')) return true;
    if (text.match(/^set \w/m) && text.match(/^map \w/m) && text.includes('lf')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'lf terminal file manager configuration — settings, keymaps, and custom commands.',
    tags: ['lf', 'filemanager', 'terminal', 'config'],
  },
};
