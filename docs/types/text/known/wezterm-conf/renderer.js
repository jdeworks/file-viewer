// WezTerm Lua config renderer. Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function luaVal(text, key) {
  // Match config.key = value (string, number, bool)
  const re = new RegExp('config\\.' + key + '\\s*=\\s*(.+?)\\s*(?:--|\\n|$)');
  const m = text.match(re);
  if (!m) return null;
  let v = m[1].trim();
  // Strip trailing comma or comment
  v = v.replace(/,?\s*--.*$/, '').trim();
  // Strip surrounding quotes
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    v = v.slice(1, -1);
  }
  return v || null;
}

function luaFontName(text) {
  // wezterm.font('FontName', ...) or wezterm.font("FontName", ...)
  const m = text.match(/wezterm\.font\s*\(\s*['"]([^'"]+)['"]/);
  if (m) return m[1];
  // config.font = wezterm.font('...')
  const m2 = text.match(/config\.font\s*=\s*wezterm\.font\s*\(\s*['"]([^'"]+)['"]/);
  if (m2) return m2[1];
  return null;
}

function luaCountKeys(text) {
  // Count entries in config.keys = { { ... }, { ... }, ... }
  const keysBlock = (() => {
    const m = text.match(/config\.keys\s*=\s*\{([\s\S]*?)\n\}/);
    return m ? m[1] : '';
  })();
  if (!keysBlock) return 0;
  return (keysBlock.match(/\{\s*key\s*=/g) || []).length;
}

function luaFirstKeys(text, max) {
  // Extract first `max` key bindings: { key = 'x', mods = '...', action = ... }
  const results = [];
  const re = /\{\s*key\s*=\s*['"]([^'"]+)['"](?:,\s*mods\s*=\s*['"]([^'"]+)['"])?,\s*action\s*=\s*([^}]+)/g;
  let m;
  while ((m = re.exec(text)) !== null && results.length < max) {
    results.push({ key: m[1], mods: m[2] || '', action: m[3].trim().replace(/,?\s*\}.*/, '').trim() });
  }
  return results;
}

function chip(label, color) {
  return '<span class="weztermcfg-chip" style="display:inline-block;padding:1px 7px;border-radius:3px;background:' + color + ';color:#fff;font-size:0.82em;font-weight:600;margin-right:4px">' + esc(label) + '</span>';
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'weztermcfg-doc';
  const text = intake.text || '';

  const fontName = luaFontName(text);
  const fontSize = luaVal(text, 'font_size');
  const colorScheme = luaVal(text, 'color_scheme');
  const bgOpacity = luaVal(text, 'window_background_opacity');
  const decorations = luaVal(text, 'window_decorations');
  const initRows = luaVal(text, 'initial_rows');
  const initCols = luaVal(text, 'initial_cols');
  const enableTabBar = luaVal(text, 'enable_tab_bar');
  const fancyTabBar = luaVal(text, 'use_fancy_tab_bar');
  const tabBarBottom = luaVal(text, 'tab_bar_at_bottom');
  const frontEnd = luaVal(text, 'front_end');
  const animFps = luaVal(text, 'animation_fps');
  const keyCount = luaCountKeys(text);
  const firstKeys = keyCount > 0 ? luaFirstKeys(text, 4) : [];
  const hasMux = text.includes('config.unix_domains') || text.includes('config.ssh_domains');

  const badge = '<span class="weztermcfg-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#1a3a1a;color:#6fcf6f;font-weight:700;font-size:0.85em">WezTerm</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + ' <span style="font-weight:600;margin-left:6px">WezTerm Config</span></div>'
    + '<div class="pj-meta"><span class="pj-tag">Lua</span>';
  if (keyCount) html += '<span class="pj-tag">' + keyCount + ' key binding' + (keyCount !== 1 ? 's' : '') + '</span>';
  if (hasMux) html += '<span class="pj-tag">multiplexer</span>';
  html += '</div></header>';

  // Font card
  if (fontName || fontSize) {
    html += '<section class="kf-svc"><h3>Font</h3><ul class="kf-list">';
    if (fontName) html += '<li class="kf-pat"><code class="ts-key">font</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(fontName) + '</span></li>';
    if (fontSize) html += '<li class="kf-pat"><code class="ts-key">font_size</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(fontSize) + 'pt</span></li>';
    html += '</ul></section>';
  }

  // Color scheme card
  if (colorScheme) {
    html += '<section class="kf-svc"><h3>Color Scheme</h3><ul class="kf-list">';
    html += '<li class="kf-pat"><code class="ts-key">color_scheme</code>'
      + '<span class="weztermcfg-chip" style="display:inline-block;padding:1px 7px;border-radius:3px;background:#2d2d5e;color:#a0b0ff;font-size:0.82em;margin-left:8px">' + esc(colorScheme) + '</span></li>';
    html += '</ul></section>';
  }

  // Window settings card
  if (bgOpacity || decorations || initRows || initCols) {
    html += '<section class="kf-svc"><h3>Window</h3><ul class="kf-list">';
    if (bgOpacity) {
      const pct = Math.round(parseFloat(bgOpacity) * 100);
      html += '<li class="kf-pat"><code class="ts-key">window_background_opacity</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(pct) + '%</span></li>';
    }
    if (decorations) html += '<li class="kf-pat"><code class="ts-key">window_decorations</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(decorations) + '</span></li>';
    if (initRows && initCols) html += '<li class="kf-pat"><code class="ts-key">initial_size</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(initCols) + ' cols × ' + esc(initRows) + ' rows</span></li>';
    else if (initRows) html += '<li class="kf-pat"><code class="ts-key">initial_rows</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(initRows) + '</span></li>';
    html += '</ul></section>';
  }

  // Tab bar card
  if (enableTabBar !== null || fancyTabBar !== null || tabBarBottom !== null) {
    html += '<section class="kf-svc"><h3>Tab Bar</h3><ul class="kf-list">';
    if (enableTabBar !== null) {
      html += '<li class="kf-pat"><code class="ts-key">enable_tab_bar</code>'
        + chip(enableTabBar === 'true' ? 'on' : 'off', enableTabBar === 'true' ? '#2a7a2a' : '#7a2a2a') + '</li>';
    }
    if (fancyTabBar !== null) {
      html += '<li class="kf-pat"><code class="ts-key">use_fancy_tab_bar</code>'
        + chip(fancyTabBar === 'true' ? 'fancy' : 'compact', '#555') + '</li>';
    }
    if (tabBarBottom !== null) {
      html += '<li class="kf-pat"><code class="ts-key">tab_bar_at_bottom</code>'
        + chip(tabBarBottom === 'true' ? 'bottom' : 'top', '#555') + '</li>';
    }
    html += '</ul></section>';
  }

  // Performance card
  if (frontEnd || animFps) {
    html += '<section class="kf-svc"><h3>Performance</h3><ul class="kf-list">';
    if (frontEnd) {
      const feColor = frontEnd === 'WebGpu' ? '#1a6a1a' : frontEnd === 'OpenGL' ? '#1a3a6a' : '#555';
      html += '<li class="kf-pat"><code class="ts-key">front_end</code>' + chip(frontEnd, feColor) + '</li>';
    }
    if (animFps) html += '<li class="kf-pat"><code class="ts-key">animation_fps</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(animFps) + ' fps</span></li>';
    html += '</ul></section>';
  }

  // Keys card
  if (firstKeys.length > 0) {
    html += '<section class="kf-svc"><h3>Key Bindings (' + keyCount + ')</h3><ul class="kf-list">';
    for (const k of firstKeys) {
      const combo = (k.mods ? k.mods + '+' : '') + k.key;
      const action = k.action.replace(/^wezterm\.action\./, '').replace(/^wezterm\.action\b/, '').trim();
      html += '<li class="kf-pat"><code class="ts-key">' + esc(combo) + '</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(action) + '</span></li>';
    }
    if (keyCount > firstKeys.length) html += '<li class="kf-pat" style="color:#888">…and ' + (keyCount - firstKeys.length) + ' more</li>';
    html += '</ul></section>';
  }

  // Multiplexer card
  if (hasMux) {
    html += '<section class="kf-svc"><h3>Multiplexer</h3><ul class="kf-list">';
    if (text.includes('config.unix_domains')) html += '<li class="kf-pat"><code class="ts-key">unix_domains</code><span class="ts-doc" style="flex:1;padding-left:8px">configured</span></li>';
    if (text.includes('config.ssh_domains')) html += '<li class="kf-pat"><code class="ts-key">ssh_domains</code><span class="ts-doc" style="flex:1;padding-left:8px">configured</span></li>';
    html += '</ul></section>';
  }

  if (!fontName && !fontSize && !colorScheme && !bgOpacity && !frontEnd && !keyCount) {
    html += '<p class="kf-note">No WezTerm config directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
