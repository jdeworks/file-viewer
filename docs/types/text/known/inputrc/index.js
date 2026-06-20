export default {
  id: 'inputrc',
  label: 'inputrc',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.inputrc' || n === 'inputrc') return true;
    const text = intake.textSample || intake.text || '';
    // inputrc: set editing-mode, set completion-*, $if Bash
    if (text.includes('set editing-mode') || text.includes('set completion-ignore-case')) return true;
    if (text.includes('set bell-style') && (text.includes('set vi-mode') || text.includes('$if '))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GNU readline configuration — editing mode, completion, key bindings, and display settings.',
    tags: ['readline', 'inputrc', 'bash', 'terminal', 'config'],
  },
};
