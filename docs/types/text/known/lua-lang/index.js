export const plugin = {
  id: 'lua-lang',
  label: 'Lua',
  tags: ['lua', 'scripting', 'embedded', 'gamedev'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.lua')) return false;
    // Defer init.lua to neovim-config plugin when it contains Neovim-specific APIs
    // Defer .wezterm.lua / wezterm.lua to wezterm-conf plugin (comes later in KNOWN)
    if (name === '.wezterm.lua' || name === 'wezterm.lua') return null;
    const text = intake.text || '';
    if (name === 'init.lua' && (text.includes('vim.opt') || text.includes('vim.keymap') || text.includes('vim.g.mapleader'))) return false;
    const hits = [
      /\bfunction\s+\w+/.test(text),
      /\blocal\s+\w+/.test(text),
      /\brequire\s*\(/.test(text),
      /\breturn\s+/.test(text),
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Lua is a lightweight, high-level scripting language designed for embedded use in applications. It is popular in game development (Roblox, LÖVE, World of Warcraft addons) and as a configuration language.',
    usedFor: [
      { label: 'lua.org', description: 'Official Lua language home', href: 'https://www.lua.org/' },
      { label: 'LuaRocks', description: 'Lua package manager', href: 'https://luarocks.org/' },
    ],
  },
};
export default plugin;
