// i3 window manager config renderer. Pure text parsing — no eval, no execution.
// Detects: modifier key, font, keybindings, workspaces, bar settings, colors, gaps, startup apps.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// i3 colors are #RRGGBB hex only — validate before use in a style attribute (CSS injection guard).
function safeHexColor(v) {
  return /^#[0-9a-fA-F]{6}$/.test(v || '') ? v : null;
}

function parseVars(text) {
  const vars = {};
  const re = /^set\s+(\$\w+)\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) vars[m[1]] = m[2].trim();
  return vars;
}

function resolveVars(str, vars) {
  return str.replace(/\$\w+/g, (v) => vars[v] || v);
}

function parseMod(vars) {
  const raw = vars['$mod'] || '';
  if (raw === 'Mod4') return 'Super (Mod4)';
  if (raw === 'Mod1') return 'Alt (Mod1)';
  return raw || null;
}

function parseFont(text) {
  const m = text.match(/^font\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function parseGaps(text) {
  const inner = text.match(/^gaps\s+inner\s+(\d+)/m);
  const outer = text.match(/^gaps\s+outer\s+(\d+)/m);
  return { inner: inner ? inner[1] : null, outer: outer ? outer[1] : null };
}

function parseBorders(text) {
  const def = text.match(/^default_border\s+(\S+(?:\s+\d+)?)/m);
  const flt = text.match(/^default_floating_border\s+(\S+(?:\s+\d+)?)/m);
  return { default: def ? def[1] : null, floating: flt ? flt[1] : null };
}

function parseBar(text) {
  const barMatch = text.match(/^bar\s*\{([^}]*)\}/ms);
  if (!barMatch) return null;
  const body = barMatch[1];
  const pos = (body.match(/position\s+(\S+)/) || [])[1] || 'bottom';
  const statusCmd = (body.match(/status_command\s+(.+)/) || [])[1];
  return { position: pos, statusCommand: statusCmd ? statusCmd.trim() : null };
}

function parseColors(text) {
  const colors = [];
  const re = /^(client\.\w+)\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const parts = m[2].trim().split(/\s+/);
    colors.push({ name: m[1], border: parts[0], bg: parts[1], text: parts[2] });
  }
  return colors;
}

function parseWorkspaces(vars) {
  // Workspace vars like $ws1 "1", $ws2 "2", etc.
  const ws = [];
  for (const [k, v] of Object.entries(vars)) {
    if (/^\$ws\d+$/.test(k)) ws.push({ var: k, label: v.replace(/^"|"$/g, '') });
  }
  return ws.sort((a, b) => a.var.localeCompare(b.var, undefined, { numeric: true }));
}

function parseBindsyms(text, vars) {
  const bindings = [];
  const re = /^bindsym\s+(\S+)\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].trim();
    const cmd = resolveVars(m[2].trim(), vars);
    bindings.push({ key, cmd });
  }
  return bindings;
}

function categorizeBindings(bindings) {
  const launch = [], windowMgmt = [], workspaces = [], system = [], other = [];
  for (const b of bindings) {
    const c = b.cmd.toLowerCase();
    if (/workspace\s+number|move container to workspace/.test(c)) {
      workspaces.push(b);
    } else if (/^exec/.test(c)) {
      launch.push(b);
    } else if (/kill|focus|move|resize|layout|fullscreen|floating|split|mode/.test(c)) {
      windowMgmt.push(b);
    } else if (/reload|restart|exit/.test(c)) {
      system.push(b);
    } else {
      other.push(b);
    }
  }
  return { launch, windowMgmt, workspaces, system, other };
}

function parseExecs(text) {
  const items = [];
  const re = /^exec(?:_always)?\s+(?:--no-startup-id\s+)?(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const always = /^exec_always/.test(m[0]);
    items.push({ cmd: m[1].trim(), always });
  }
  return items;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'i3cfg-doc';
  const text = intake.text || '';

  const vars = parseVars(text);
  const mod = parseMod(vars);
  const font = parseFont(text);
  const gaps = parseGaps(text);
  const borders = parseBorders(text);
  const bar = parseBar(text);
  const colors = parseColors(text);
  const workspaces = parseWorkspaces(vars);
  const allBindsyms = parseBindsyms(text, vars);
  const cats = categorizeBindings(allBindsyms);
  const execs = parseExecs(text);

  const badge = '<span class="i3cfg-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#333333;color:#fff;font-weight:700;font-size:0.85em">i3</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge;
  if (mod) html += ' <span class="kf-tag" style="background:#4c7899;color:#fff">' + esc(mod) + '</span>';
  if (font) html += ' <span class="kf-tag">' + esc(font) + '</span>';
  html += '</div><div class="pj-meta">';
  html += '<span class="pj-tag">' + allBindsyms.length + ' keybinding' + (allBindsyms.length !== 1 ? 's' : '') + '</span>';
  if (execs.length) html += '<span class="pj-tag">' + execs.length + ' startup app' + (execs.length !== 1 ? 's' : '') + '</span>';
  if (workspaces.length) html += '<span class="pj-tag">' + workspaces.length + ' workspace' + (workspaces.length !== 1 ? 's' : '') + '</span>';
  html += '</div></header>';

  // Startup apps
  if (execs.length) {
    const rows = execs.map((e) =>
      '<li class="kf-pat"><code>' + esc(e.cmd) + '</code>'
      + (e.always ? '<span class="kf-tag" style="margin-left:6px">always</span>' : '') + '</li>'
    ).join('');
    html += '<section class="kf-svc"><h3>Startup Applications <span class="pj-count">' + execs.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Keybindings by category
  const catDefs = [
    { key: 'launch', label: 'Launch Applications' },
    { key: 'windowMgmt', label: 'Window Management' },
    { key: 'workspaces', label: 'Workspaces' },
    { key: 'system', label: 'System' },
    { key: 'other', label: 'Other' },
  ];
  for (const { key, label } of catDefs) {
    const items = cats[key];
    if (!items.length) continue;
    const rows = items.slice(0, 20).map((b) =>
      '<li class="kf-pat"><code class="ts-key">' + esc(b.key) + '</code>'
      + '<span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(b.cmd.slice(0, 80)) + '</span></li>'
    ).join('');
    html += '<section class="kf-svc"><h3>' + esc(label) + ' <span class="pj-count">' + items.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Workspaces
  if (workspaces.length) {
    const chips = workspaces.map((w) => '<span class="kf-tag">' + esc(w.label) + '</span>').join(' ');
    html += '<section class="kf-svc"><h3>Workspaces</h3><div style="padding:4px 0">' + chips + '</div></section>';
  }

  // Bar
  if (bar) {
    html += '<section class="kf-svc"><h3>Bar</h3><ul class="kf-list">';
    html += '<li class="kf-pat"><code class="ts-key">position</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(bar.position) + '</span></li>';
    if (bar.statusCommand) html += '<li class="kf-pat"><code class="ts-key">status_command</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(bar.statusCommand) + '</span></li>';
    html += '</ul></section>';
  }

  // Gaps & Borders
  if (gaps.inner || gaps.outer || borders.default || borders.floating) {
    html += '<section class="kf-svc"><h3>Appearance</h3><ul class="kf-list">';
    if (gaps.inner) html += '<li class="kf-pat"><code class="ts-key">gaps inner</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(gaps.inner) + 'px</span></li>';
    if (gaps.outer) html += '<li class="kf-pat"><code class="ts-key">gaps outer</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(gaps.outer) + 'px</span></li>';
    if (borders.default) html += '<li class="kf-pat"><code class="ts-key">default_border</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(borders.default) + '</span></li>';
    if (borders.floating) html += '<li class="kf-pat"><code class="ts-key">default_floating_border</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(borders.floating) + '</span></li>';
    html += '</ul></section>';
  }

  // Colors
  if (colors.length) {
    const rows = colors.map((c) => {
      const safeBg = safeHexColor(c.bg);
      return '<li class="kf-pat"><code class="ts-key">' + esc(c.name) + '</code>'
      + (safeBg ? '<span style="display:inline-block;width:14px;height:14px;border-radius:2px;background:' + safeBg + ';margin-left:8px;vertical-align:middle"></span>' : '')
      + '</li>';
    }).join('');
    html += '<section class="kf-svc"><h3>Colors</h3><ul class="kf-list">' + rows + '</ul></section>';
  }

  if (!allBindsyms.length && !execs.length) {
    html += '<p class="kf-note">No i3 config directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
