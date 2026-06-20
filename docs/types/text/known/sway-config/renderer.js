// Sway Wayland compositor config renderer. Pure text parsing — no eval, no execution.
// Detects: modifier key, font, outputs, inputs, wallpaper, keybindings, gaps, bar, startup apps.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  const smart = /^smart_gaps\s+on/m.test(text);
  return { inner: inner ? inner[1] : null, outer: outer ? outer[1] : null, smart };
}

function parseOutputs(text) {
  const outputs = [];
  // Match lines like: output NAME resolution WxH position X,Y scale N
  const re = /^output\s+(?!\*\s+bg)(\S+)\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const rest = m[2].trim();
    const res = (rest.match(/resolution\s+(\d+x\d+)/) || [])[1] || null;
    const pos = (rest.match(/position\s+([\d,]+)/) || [])[1] || null;
    const scale = (rest.match(/scale\s+([\d.]+)/) || [])[1] || null;
    outputs.push({ name, resolution: res, position: pos, scale });
  }
  return outputs;
}

function parseWallpaper(text) {
  const m = text.match(/^output\s+\*\s+bg\s+(\S+)\s+(\S+)/m);
  return m ? { path: m[1], mode: m[2] } : null;
}

function parseInputBlocks(text) {
  const inputs = [];
  // Match input "device" { ... } blocks
  const re = /^input\s+("?[^{"\n]+"?)\s*\{([^}]*)\}/gms;
  let m;
  while ((m = re.exec(text)) !== null) {
    const device = m[1].trim().replace(/^"|"$/g, '');
    const body = m[2];
    const settings = {};
    const lineRe = /^\s*(\w+)\s+(.+)$/gm;
    let lm;
    while ((lm = lineRe.exec(body)) !== null) {
      settings[lm[1].trim()] = lm[2].trim();
    }
    inputs.push({ device, settings });
  }
  return inputs;
}

function parseBar(text) {
  const barMatch = text.match(/^bar\s*\{([^}]*)\}/ms);
  if (!barMatch) return null;
  const body = barMatch[1];
  const swaybarCmd = (body.match(/swaybar_command\s+(\S+)/) || [])[1] || null;
  const statusCmd = (body.match(/status_command\s+(.+)/) || [])[1];
  const pos = (body.match(/position\s+(\S+)/) || [])[1] || 'bottom';
  return { position: pos, swaybarCommand: swaybarCmd, statusCommand: statusCmd ? statusCmd.trim() : null };
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
  host.className = 'swaycfg-doc';
  const text = intake.text || '';

  const vars = parseVars(text);
  const mod = parseMod(vars);
  const font = parseFont(text);
  const gaps = parseGaps(text);
  const outputs = parseOutputs(text);
  const wallpaper = parseWallpaper(text);
  const inputs = parseInputBlocks(text);
  const bar = parseBar(text);
  const allBindsyms = parseBindsyms(text, vars);
  const execs = parseExecs(text);

  const badge = '<span class="swaycfg-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#44475a;color:#fff;font-weight:700;font-size:0.85em">Sway</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge;
  if (mod) html += ' <span class="kf-tag" style="background:#6272a4;color:#fff">' + esc(mod) + '</span>';
  if (font) html += ' <span class="kf-tag">' + esc(font) + '</span>';
  html += '</div><div class="pj-meta">';
  html += '<span class="pj-tag">Wayland</span>';
  if (outputs.length) html += '<span class="pj-tag">' + outputs.length + ' output' + (outputs.length !== 1 ? 's' : '') + '</span>';
  if (inputs.length) html += '<span class="pj-tag">' + inputs.length + ' input' + (inputs.length !== 1 ? 's' : '') + '</span>';
  html += '<span class="pj-tag">' + allBindsyms.length + ' keybinding' + (allBindsyms.length !== 1 ? 's' : '') + '</span>';
  html += '</div></header>';

  // Outputs
  if (outputs.length) {
    const rows = outputs.map((o) => {
      let detail = '';
      if (o.resolution) detail += '<span class="kf-tag">' + esc(o.resolution) + '</span> ';
      if (o.scale) detail += '<span class="kf-tag">scale ' + esc(o.scale) + '</span> ';
      if (o.position) detail += '<span class="kf-tag">pos ' + esc(o.position) + '</span>';
      return '<li class="kf-pat"><code class="ts-key">' + esc(o.name) + '</code><span style="flex:1;padding-left:8px">' + detail + '</span></li>';
    }).join('');
    html += '<section class="kf-svc"><h3>Outputs <span class="pj-count">' + outputs.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Wallpaper
  if (wallpaper) {
    html += '<section class="kf-svc"><h3>Wallpaper</h3><ul class="kf-list">'
      + '<li class="kf-pat"><code>' + esc(wallpaper.path) + '</code><span class="kf-tag" style="margin-left:8px">' + esc(wallpaper.mode) + '</span></li>'
      + '</ul></section>';
  }

  // Inputs
  if (inputs.length) {
    const rows = inputs.map((inp) => {
      const settingItems = Object.entries(inp.settings).slice(0, 6).map(([k, v]) =>
        '<li class="kf-pat" style="padding-left:16px"><code class="ts-key">' + esc(k) + '</code>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px">' + esc(v) + '</span></li>'
      ).join('');
      return '<li class="kf-pat"><code class="ts-key">' + esc(inp.device) + '</code></li>'
        + settingItems;
    }).join('');
    html += '<section class="kf-svc"><h3>Inputs <span class="pj-count">' + inputs.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Startup apps
  if (execs.length) {
    const rows = execs.map((e) =>
      '<li class="kf-pat"><code>' + esc(e.cmd) + '</code>'
      + (e.always ? '<span class="kf-tag" style="margin-left:6px">always</span>' : '') + '</li>'
    ).join('');
    html += '<section class="kf-svc"><h3>Startup Applications <span class="pj-count">' + execs.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + '</ul></section>';
  }

  // Keybindings (summary by category)
  if (allBindsyms.length) {
    const rows = allBindsyms.slice(0, 25).map((b) =>
      '<li class="kf-pat"><code class="ts-key">' + esc(b.key) + '</code>'
      + '<span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(b.cmd.slice(0, 80)) + '</span></li>'
    ).join('');
    const more = allBindsyms.length > 25 ? '<li class="kf-pat" style="color:var(--fg2,#777)">…and ' + (allBindsyms.length - 25) + ' more</li>' : '';
    html += '<section class="kf-svc"><h3>Keybindings <span class="pj-count">' + allBindsyms.length + '</span></h3>'
      + '<ul class="kf-list">' + rows + more + '</ul></section>';
  }

  // Bar
  if (bar) {
    html += '<section class="kf-svc"><h3>Bar</h3><ul class="kf-list">';
    if (bar.swaybarCommand) html += '<li class="kf-pat"><code class="ts-key">swaybar_command</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(bar.swaybarCommand) + '</span></li>';
    html += '<li class="kf-pat"><code class="ts-key">position</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(bar.position) + '</span></li>';
    if (bar.statusCommand) html += '<li class="kf-pat"><code class="ts-key">status_command</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(bar.statusCommand) + '</span></li>';
    html += '</ul></section>';
  }

  // Gaps
  if (gaps.inner || gaps.outer) {
    html += '<section class="kf-svc"><h3>Gaps</h3><ul class="kf-list">';
    if (gaps.inner) html += '<li class="kf-pat"><code class="ts-key">inner</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(gaps.inner) + 'px</span></li>';
    if (gaps.outer) html += '<li class="kf-pat"><code class="ts-key">outer</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(gaps.outer) + 'px</span></li>';
    if (gaps.smart) html += '<li class="kf-pat"><code class="ts-key">smart_gaps</code><span class="ts-doc" style="flex:1;padding-left:8px">on</span></li>';
    html += '</ul></section>';
  }

  if (!allBindsyms.length && !execs.length && !outputs.length) {
    html += '<p class="kf-note">No Sway config directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
