// Neovim config renderer. Pure text parsing — no eval, no execution.
// Detects: plugin manager, key mappings, colorscheme, vim.opt settings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tag(text) {
  return '<span class="kf-tag">' + esc(text) + '</span>';
}

function detectPluginManager(text) {
  if (/require\s*\(\s*['"]lazy['"]\s*\)/.test(text) || /lazy\.nvim/.test(text) || /LazyVim/.test(text)) return 'lazy.nvim';
  if (/require\s*\(\s*['"]packer['"]\s*\)/.test(text) || /packer\.startup/.test(text)) return 'packer.nvim';
  if (/call plug#begin/.test(text)) return 'vim-plug';
  if (/require\s*\(\s*['"]plug['"]\s*\)/.test(text)) return 'plug';
  return null;
}

function extractColorscheme(text) {
  const m = text.match(/(?:vim\.cmd\s*\[\[?\s*colorscheme\s+(\S+)|colorscheme\s+(\S+)|vim\.cmd\(['"]colorscheme\s+(\S+))/);
  return m ? (m[1] || m[2] || m[3]) : null;
}

function extractKeymaps(text) {
  // vim.keymap.set(...) or vim.api.nvim_set_keymap(...)
  const maps = [];
  const re = /vim\.keymap\.set\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null && maps.length < 30) {
    maps.push({ mode: m[1], lhs: m[2] });
  }
  const re2 = /vim\.api\.nvim_set_keymap\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  while ((m = re2.exec(text)) !== null && maps.length < 30) {
    maps.push({ mode: m[1], lhs: m[2] });
  }
  return maps;
}

function extractOpts(text) {
  const opts = [];
  const re = /vim\.opt(?:_global|_local)?\.(\w+)\s*=\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(text)) !== null && opts.length < 20) {
    opts.push({ key: m[1], val: m[2].trim().replace(/\s*--.*$/, '') });
  }
  return opts;
}

function extractRequires(text) {
  const mods = new Set();
  const re = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) mods.add(m[1]);
  return [...mods].slice(0, 30);
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  const text = intake.text || '';

  const pm = detectPluginManager(text);
  const colorscheme = extractColorscheme(text);
  const keymaps = extractKeymaps(text);
  const opts = extractOpts(text);
  const requires = extractRequires(text);

  // Detect plugin list from lazy/packer blocks
  const pluginRe = /['"]([^'"]+\/[^'"]+)['"]/g;
  const plugins = new Set();
  let pm2;
  while ((pm2 = pluginRe.exec(text)) !== null && plugins.size < 30) {
    const candidate = pm2[1];
    // Looks like user/plugin or plugin-manager/plugin
    if (/^[^/]+\/[^/]+$/.test(candidate) && !candidate.startsWith('http')) {
      plugins.add(candidate);
    }
  }

  const badge = '<span class="nvc-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#57A143;color:#fff;font-weight:600;font-size:0.85em">Neovim Config</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + '</div><div class="pj-meta">'
    + (pm ? '<span class="pj-tag">' + esc(pm) + '</span>' : '')
    + (colorscheme ? '<span class="pj-tag">theme: ' + esc(colorscheme) + '</span>' : '')
    + '</div></header>';

  // Plugin manager section
  if (pm) {
    const plugList = [...plugins];
    const rows = plugList.map((p) => '<li class="kf-pat"><code>' + esc(p) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>Plugin Manager: ' + esc(pm) + (plugList.length ? ' <span class="pj-count">' + plugList.length + ' plugin(s)</span>' : '') + '</h3>'
      + (rows ? '<ul class="kf-list">' + rows + '</ul>' : '<p class="kf-note">No explicit plugin paths detected.</p>')
      + '</section>';
  }

  // Keymaps
  if (keymaps.length) {
    const rows = keymaps.map((k) => '<li class="kf-pat"><code>' + esc(k.lhs) + '</code>' + tag(k.mode) + '</li>').join('');
    html += '<section class="kf-svc"><h3>Key Mappings <span class="pj-count">' + keymaps.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Options
  if (opts.length) {
    const rows = opts.map((o) => '<li class="kf-pat"><code class="ts-key">' + esc(o.key) + '</code>'
      + '<span style="flex:1"></span><code class="pj-ver">' + esc(o.val) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>Options <span class="pj-count">' + opts.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Requires summary
  if (requires.length) {
    const rows = requires.map((r) => '<li class="kf-pat"><code>' + esc(r) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>Modules Required <span class="pj-count">' + requires.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  if (!pm && !keymaps.length && !opts.length && !requires.length) {
    html += '<p class="kf-note">No structured Neovim configuration found.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
