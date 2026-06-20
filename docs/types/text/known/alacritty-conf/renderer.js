// Alacritty terminal config renderer. Handles both TOML (alacritty.toml) and
// YAML (alacritty.yml) formats by detecting `=` vs `:` assignment style.
// Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Detect format: TOML uses `key = value`, YAML uses `key: value`
function detectFormat(text) {
  const tomlScore = (text.match(/^\s*\w+\s*=\s*/gm) || []).length;
  const yamlScore = (text.match(/^\s*\w+:\s*/gm) || []).length;
  return tomlScore >= yamlScore ? 'toml' : 'yaml';
}

// Strip surrounding quotes from a value string
function stripQuotes(s) {
  if (!s) return s;
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ── TOML parsing helpers ──
function tomlSection(text, section) {
  // Match content between [section] and the next [something] (or end)
  const re = new RegExp('\\[' + section.replace(/\./g, '\\.') + '\\]([\\s\\S]*?)(?=\\n\\[|$)', 'i');
  const m = text.match(re);
  return m ? m[1] : '';
}

function tomlVal(block, key) {
  const re = new RegExp('^\\s*' + key + '\\s*=\\s*(.+)$', 'm');
  const m = block.match(re);
  return m ? stripQuotes(m[1].trim()) : null;
}

function tomlCountSections(text, prefix) {
  // Count [[prefix]] occurrences
  const re = new RegExp('\\[\\[' + prefix.replace(/\./g, '\\.') + '\\]\\]', 'g');
  return (text.match(re) || []).length;
}

// ── YAML parsing helpers ──
function yamlBlock(text, key, indent) {
  // Find `key:` and return lines until the indent drops back to same level
  const baseIndent = indent || 0;
  const lines = text.split('\n');
  let inBlock = false;
  let blockLines = [];
  const keyRe = new RegExp('^(\\s{' + baseIndent + '})' + key + ':');
  for (const line of lines) {
    if (!inBlock) {
      if (keyRe.test(line)) { inBlock = true; continue; }
    } else {
      // Stop when we hit a non-empty line with indent <= baseIndent
      if (line.trim() && !line.startsWith(' '.repeat(baseIndent + 1))) break;
      blockLines.push(line);
    }
  }
  return blockLines.join('\n');
}

function yamlVal(text, key) {
  const re = new RegExp('^\\s*' + key + ':\\s*(.+)$', 'm');
  const m = text.match(re);
  return m ? stripQuotes(m[1].trim()) : null;
}

function yamlCountItems(text, key) {
  // Count list items under a key (lines starting with `  - `)
  const block = yamlBlock(text, key, 0);
  return (block.match(/^\s+-\s+/gm) || []).length;
}

// ── Shared extraction ──
function extract(text) {
  const fmt = detectFormat(text);
  const data = { fmt };

  if (fmt === 'toml') {
    const fontBlock = tomlSection(text, 'font');
    const fontNormal = tomlSection(text, 'font.normal');
    data.fontFamily = tomlVal(fontNormal, 'family') || tomlVal(fontBlock, 'family');
    data.fontSize = tomlVal(fontBlock, 'size');

    const windowBlock = tomlSection(text, 'window');
    data.opacity = tomlVal(windowBlock, 'opacity');
    data.decorations = tomlVal(windowBlock, 'decorations');
    data.startupMode = tomlVal(windowBlock, 'startup_mode');
    data.title = tomlVal(windowBlock, 'title');

    const scrollBlock = tomlSection(text, 'scrolling');
    data.scrollback = tomlVal(scrollBlock, 'history');

    const primaryBlock = tomlSection(text, 'colors.primary');
    data.bg = tomlVal(primaryBlock, 'background');
    data.fg = tomlVal(primaryBlock, 'foreground');

    const envBlock = tomlSection(text, 'env');
    data.term = tomlVal(envBlock, 'TERM');

    data.bindingCount = tomlCountSections(text, 'keyboard.bindings');
  } else {
    data.fontFamily = yamlVal(text, 'family') || null;
    data.fontSize = yamlVal(text, 'size');
    data.opacity = yamlVal(text, 'opacity');
    data.decorations = yamlVal(text, 'decorations');
    data.startupMode = yamlVal(text, 'startup_mode');
    data.title = yamlVal(text, 'title');
    data.scrollback = yamlVal(text, 'history');
    data.term = yamlVal(text, 'TERM');

    // Colors in YAML are nested under colors: primary:
    const colorsPrimaryBlock = (() => {
      const block = yamlBlock(text, 'colors', 0);
      return yamlBlock(block, 'primary', 2);
    })();
    data.bg = yamlVal(colorsPrimaryBlock, 'background') || yamlVal(text, 'background');
    data.fg = yamlVal(colorsPrimaryBlock, 'foreground') || yamlVal(text, 'foreground');

    data.bindingCount = yamlCountItems(text, 'key_bindings');
  }

  return data;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'alacritty-doc';
  const text = intake.text || '';

  const d = extract(text);

  const badge = '<span class="alacritty-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#E06C75;color:#fff;font-weight:700;font-size:0.85em">Alacritty</span>';
  const fmtTag = '<span class="kf-tag" style="background:#555;color:#fff">' + esc(d.fmt === 'toml' ? 'TOML' : 'YAML') + '</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + ' ' + fmtTag;
  if (d.title) html += ' <span class="kf-tag">' + esc(d.title) + '</span>';
  html += '</div><div class="pj-meta">';
  if (d.term) html += '<span class="pj-tag">TERM=' + esc(d.term) + '</span>';
  if (d.bindingCount) html += '<span class="pj-tag">' + d.bindingCount + ' keybinding' + (d.bindingCount !== 1 ? 's' : '') + '</span>';
  html += '</div></header>';

  // Font card
  if (d.fontFamily || d.fontSize) {
    html += '<section class="kf-svc"><h3>Font</h3><ul class="kf-list">';
    if (d.fontFamily) html += '<li class="kf-pat"><code class="ts-key">family</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.fontFamily) + '</span></li>';
    if (d.fontSize) html += '<li class="kf-pat"><code class="ts-key">size</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.fontSize) + 'pt</span></li>';
    html += '</ul></section>';
  }

  // Window card
  if (d.opacity || d.decorations || d.startupMode) {
    html += '<section class="kf-svc"><h3>Window</h3><ul class="kf-list">';
    if (d.opacity) html += '<li class="kf-pat"><code class="ts-key">opacity</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.opacity) + '</span></li>';
    if (d.decorations) html += '<li class="kf-pat"><code class="ts-key">decorations</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.decorations) + '</span></li>';
    if (d.startupMode) html += '<li class="kf-pat"><code class="ts-key">startup_mode</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.startupMode) + '</span></li>';
    html += '</ul></section>';
  }

  // Scrollback
  if (d.scrollback) {
    html += '<section class="kf-svc"><h3>Scrollback</h3><ul class="kf-list">';
    html += '<li class="kf-pat"><code class="ts-key">history</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(Number(d.scrollback).toLocaleString()) + ' lines</span></li>';
    html += '</ul></section>';
  }

  // Colors
  if (d.bg || d.fg) {
    html += '<section class="kf-svc"><h3>Colors</h3><ul class="kf-list">';
    if (d.bg) {
      html += '<li class="kf-pat"><code class="ts-key">background</code>'
        + '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:' + esc(d.bg) + ';margin-left:8px;vertical-align:middle;border:1px solid #555"></span>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.bg) + '</span></li>';
    }
    if (d.fg) {
      html += '<li class="kf-pat"><code class="ts-key">foreground</code>'
        + '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:' + esc(d.fg) + ';margin-left:8px;vertical-align:middle;border:1px solid #555"></span>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.fg) + '</span></li>';
    }
    html += '</ul></section>';
  }

  if (!d.fontFamily && !d.fontSize && !d.opacity && !d.scrollback && !d.bg) {
    html += '<p class="kf-note">No Alacritty config directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
