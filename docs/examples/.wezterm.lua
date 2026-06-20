-- WezTerm configuration
local wezterm = require('wezterm')
local config = wezterm.config_builder()

-- Font
config.font = wezterm.font('JetBrains Mono', { weight = 'Regular' })
config.font_size = 11.5
config.harfbuzz_features = { 'calt=1', 'clig=1', 'liga=1' }

-- Color scheme
config.color_scheme = 'Catppuccin Mocha'

-- Window appearance
config.window_background_opacity = 0.95
config.window_decorations = 'RESIZE'
config.window_close_confirmation = 'AlwaysPrompt'
config.initial_rows = 30
config.initial_cols = 120

-- Tab bar
config.enable_tab_bar = true
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = true
config.hide_tab_bar_if_only_one_tab = true

-- Performance
config.front_end = 'WebGpu'
config.animation_fps = 60
config.max_fps = 120

-- Scrollback
config.scrollback_lines = 50000

-- Key bindings
config.keys = {
  { key = 'c', mods = 'CTRL|SHIFT', action = wezterm.action.CopyTo('Clipboard') },
  { key = 'v', mods = 'CTRL|SHIFT', action = wezterm.action.PasteFrom('Clipboard') },
  { key = 'n', mods = 'CTRL|SHIFT', action = wezterm.action.SpawnWindow },
  { key = 't', mods = 'CTRL|SHIFT', action = wezterm.action.SpawnTab('CurrentPaneDomain') },
  { key = 'w', mods = 'CTRL|SHIFT', action = wezterm.action.CloseCurrentTab { confirm = true } },
  { key = 'LeftArrow', mods = 'CTRL|SHIFT', action = wezterm.action.ActivateTabRelative(-1) },
  { key = 'RightArrow', mods = 'CTRL|SHIFT', action = wezterm.action.ActivateTabRelative(1) },
  { key = 'r', mods = 'CTRL|SHIFT', action = wezterm.action.ReloadConfiguration },
}

-- Multiplexer
config.unix_domains = {
  { name = 'unix' },
}

return config
