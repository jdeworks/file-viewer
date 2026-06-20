// Vim config renderer. Pure text parsing — no eval, no execution.
// Detects: set options, plugin manager (Vundle/vim-plug/pathogen), colorscheme, key mappings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tag(text, color) {
  return color
    ? '<span class="kf-tag" style="background:' + color + ';color:#fff">' + esc(text) + '</span>'
    : '<span class="kf-tag">' + esc(text) + '</span>';
}

function detectPluginManager(text) {
  if (/call plug#begin/.test(text)) return 'vim-plug';
  if (/Plugin\s+['"]/.test(text) || /call vundle#begin/.test(text)) return 'Vundle';
  if (/pathogen#infect/.test(text)) return 'pathogen';
  if (/call minpac#add/.test(text)) return 'minpac';
  if (/call dein#add/.test(text)) return 'dein.vim';
  return null;
}

function extractPlugins(text) {
  const plugins = new Set();
  // vim-plug: Plug 'user/repo'
  const plugRe = /^\s*Plug\s+['"]([^'"]+)['"]/gm;
  let m;
  while ((m = plugRe.exec(text)) !== null) plugins.add(m[1]);
  // Vundle: Plugin 'user/repo'
  const vundleRe = /^\s*Plugin\s+['"]([^'"]+)['"]/gm;
  while ((m = vundleRe.exec(text)) !== null) plugins.add(m[1]);
  // Bundle: Bundle 'user/repo'
  const bundleRe = /^\s*Bundle\s+['"]([^'"]+)['"]/gm;
  while ((m = bundleRe.exec(text)) !== null) plugins.add(m[1]);
  return [...plugins].slice(0, 30);
}

function extractSetOptions(text) {
  const opts = [];
  const re = /^\s*set\s+(\w+)(?:=([^\s"]+))?/gm;
  let m;
  while ((m = re.exec(text)) !== null && opts.length < 25) {
    opts.push({ key: m[1], val: m[2] || null });
  }
  return opts;
}

function extractColorscheme(text) {
  const m = text.match(/^\s*colorscheme\s+(\S+)/m);
  return m ? m[1] : null;
}

function extractMappings(text) {
  const maps = [];
  const re = /^\s*(n?v?i?[nvoicx]?map(?:!)?)\s+(\S+)\s+(\S+)/gm;
  let m;
  while ((m = re.exec(text)) !== null && maps.length < 20) {
    maps.push({ mode: m[1], lhs: m[2], rhs: m[3] });
  }
  return maps;
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  const text = intake.text || '';

  const pm = detectPluginManager(text);
  const plugins = extractPlugins(text);
  const opts = extractSetOptions(text);
  const colorscheme = extractColorscheme(text);
  const mappings = extractMappings(text);

  const badge = '<span class="vc-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#019833;color:#fff;font-weight:600;font-size:0.85em">Vim Config</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + '</div><div class="pj-meta">'
    + (pm ? '<span class="pj-tag">' + esc(pm) + '</span>' : '')
    + (colorscheme ? '<span class="pj-tag">theme: ' + esc(colorscheme) + '</span>' : '')
    + '<span class="pj-tag">' + opts.length + ' option(s)</span>'
    + '</div></header>';

  // Plugin section
  if (pm || plugins.length) {
    const rows = plugins.map((p) => '<li class="kf-pat"><code>' + esc(p) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>' + (pm ? esc(pm) : 'Plugins')
      + (plugins.length ? ' <span class="pj-count">' + plugins.length + '</span>' : '') + '</h3>'
      + (rows ? '<ul class="kf-list">' + rows + '</ul>' : '<p class="kf-note">No plugins listed.</p>')
      + '</section>';
  }

  // Set options
  if (opts.length) {
    const rows = opts.map((o) => '<li class="kf-pat"><code class="ts-key">' + esc(o.key) + '</code>'
      + (o.val ? '<span style="flex:1"></span><code class="pj-ver">' + esc(o.val) + '</code>' : '') + '</li>').join('');
    html += '<section class="kf-svc"><h3>Settings <span class="pj-count">' + opts.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Mappings
  if (mappings.length) {
    const rows = mappings.map((k) => '<li class="kf-pat">' + tag(k.mode)
      + '<code>' + esc(k.lhs) + '</code>'
      + '<span class="ts-doc"> → ' + esc(k.rhs) + '</span></li>').join('');
    html += '<section class="kf-svc"><h3>Key Mappings <span class="pj-count">' + mappings.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  if (!opts.length && !pm && !mappings.length) {
    html += '<p class="kf-note">No Vim settings detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
