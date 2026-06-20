// Emacs config renderer. Pure text parsing — no eval, no execution.
// Detects: package manager, packages, custom-set-variables, keybindings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tag(text, color) {
  return color
    ? '<span class="kf-tag" style="background:' + color + ';color:#fff">' + esc(text) + '</span>'
    : '<span class="kf-tag">' + esc(text) + '</span>';
}

function detectPackageManager(text) {
  if (/\(use-package\s/.test(text)) return 'use-package';
  if (/\(straight-use-package\s/.test(text) || /straight\.el/.test(text)) return 'straight.el';
  if (/\(quelpa\s/.test(text)) return 'quelpa';
  if (/\(package-initialize\)/.test(text)) return 'package.el';
  return null;
}

function extractPackages(text) {
  const pkgs = new Set();
  // use-package declarations
  const re = /\(use-package\s+(\S+)/g;
  let m;
  while ((m = re.exec(text)) !== null) pkgs.add(m[1].replace(/[)]/g, ''));
  // straight-use-package
  const re2 = /\(straight-use-package\s+'(\S+)/g;
  while ((m = re2.exec(text)) !== null) pkgs.add(m[1].replace(/[)]/g, ''));
  // (require 'package)
  const re3 = /\(require\s+'(\S+)/g;
  while ((m = re3.exec(text)) !== null && pkgs.size < 40) pkgs.add(m[1].replace(/[)]/g, ''));
  return [...pkgs].slice(0, 30);
}

function extractCustomVars(text) {
  const vars = [];
  const start = text.indexOf('(custom-set-variables');
  if (start < 0) return vars;
  // Walk paren depth to find the matching closing paren of the whole block
  let depth = 0, i = start;
  while (i < text.length) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') { depth--; if (depth === 0) break; }
    i++;
  }
  const block = text.slice(start, i + 1);
  const re = /'\((\S+)\s+([^)]+)\)/g;
  let m;
  while ((m = re.exec(block)) !== null && vars.length < 20) {
    vars.push({ key: m[1], val: m[2].trim() });
  }
  return vars;
}

function extractKeybindings(text) {
  const keys = [];
  // (global-set-key (kbd "...") 'fn) or "..."
  const re = /\(global-set-key\s+\(kbd\s+"([^"]+)"\)\s+'?(\S+)/g;
  let m;
  while ((m = re.exec(text)) !== null && keys.length < 20) {
    keys.push({ key: m[1], fn: m[2].replace(/\)$/, '') });
  }
  // (define-key map (kbd "...") ...)
  const re2 = /\(define-key\s+\S+\s+\(kbd\s+"([^"]+)"\)\s+'?(\S+)/g;
  while ((m = re2.exec(text)) !== null && keys.length < 20) {
    keys.push({ key: m[1], fn: m[2].replace(/\)$/, '') });
  }
  return keys;
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  const text = intake.text || '';

  const pm = detectPackageManager(text);
  const packages = extractPackages(text);
  const customVars = extractCustomVars(text);
  const keybindings = extractKeybindings(text);

  const badge = '<span class="ec-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#6B3FA0;color:#fff;font-weight:600;font-size:0.85em">Emacs Config</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + '</div><div class="pj-meta">'
    + (pm ? '<span class="pj-tag">' + esc(pm) + '</span>' : '')
    + (packages.length ? '<span class="pj-tag">' + packages.length + ' package(s)</span>' : '')
    + '</div></header>';

  // Packages
  if (packages.length) {
    const rows = packages.map((p) => '<li class="kf-pat"><code>' + esc(p) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>' + (pm ? esc(pm) + ' packages' : 'Packages') + ' <span class="pj-count">' + packages.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Keybindings
  if (keybindings.length) {
    const rows = keybindings.map((k) => '<li class="kf-pat"><code>' + esc(k.key) + '</code>'
      + '<span style="flex:1"></span><code class="pj-ver">' + esc(k.fn) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>Keybindings <span class="pj-count">' + keybindings.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Custom variables
  if (customVars.length) {
    const rows = customVars.map((v) => '<li class="kf-pat"><code class="ts-key">' + esc(v.key) + '</code>'
      + '<span style="flex:1"></span><code class="pj-ver">' + esc(v.val) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>Custom Variables <span class="pj-count">' + customVars.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  if (!packages.length && !keybindings.length && !customVars.length) {
    html += '<p class="kf-note">No structured Emacs configuration found.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
