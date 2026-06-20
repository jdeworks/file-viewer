export default {
  id: 'gdbinit',
  label: 'GDB Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.gdbinit' || n === 'gdbinit') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('set print pretty') || text.includes('set pagination off')) return true;
    if (text.includes('python') && text.includes('gdb.') || text.includes('define hook-stop')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GDB (GNU Debugger) initialization file — pretty printing, Python extensions, custom commands, and display settings.',
    tags: ['gdb', 'debugger', 'c', 'c++', 'config'],
  },
};
