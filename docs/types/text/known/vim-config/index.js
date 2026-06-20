// Vim config enhancement: surfaces set options, plugin manager, colorscheme, and key mappings.
export default {
  id: 'vim-config',
  label: 'Vim Config',
  match: (intake) => {
    const name = (intake.filename || '').replace(/^.*[\\/]/, '');
    const text = intake.text || '';
    if (name === '.vimrc' || name === '_vimrc') return true;
    if (name === 'init.vim' && !text.includes('lua') && text.includes('set ')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
};
