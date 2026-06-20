// Neovim config enhancement: shows plugin manager, key mappings, colorscheme, and options.
export default {
  id: 'neovim-config',
  label: 'Neovim Config',
  match: (intake) => {
    const name = (intake.filename || '').replace(/^.*[\\/]/, '');
    const text = intake.text || '';
    if (name === 'init.lua') {
      return text.includes('require(') && (
        text.includes('vim.keymap') || text.includes('vim.opt') ||
        text.includes('nvim') || text.includes('lazy') || text.includes('packer')
      );
    }
    if (name === 'init.vim') {
      return text.includes('set ') && (text.includes('plug') || text.includes('lua'));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
};
