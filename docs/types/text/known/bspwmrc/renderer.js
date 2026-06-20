// bspwm window manager config renderer. Pure text parsing — no eval, no execution.
// Parses bspc monitor, bspc config, bspc rule lines, and autostart commands.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseMonitors(text) {
  const monitors = [];
  const re = /^bspc\s+monitor\s+(\S+)\s+-d\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const desktops = m[2].trim().split(/\s+/);
    monitors.push({ name, desktops });
  }
  return monitors;
}

function parseConfig(text) {
  const cfg = {};
  const re = /^bspc\s+config\s+(\S+)\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    cfg[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return cfg;
}

function parseRules(text) {
  const rules = [];
  const re = /^bspc\s+rule\s+-a\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const rest = m[1].trim();
    // First token (possibly quoted) is class[:instance]
    const classMatch = rest.match(/^("(?:[^"]+)"|'(?:[^']+)'|\S+)/);
    const classRaw = classMatch ? classMatch[1].replace(/^["']|["']$/g, '') : rest;
    const flags = rest.slice(classRaw.length + (classMatch[1].startsWith('"') || classMatch[1].startsWith("'") ? 2 : 0)).trim();
    rules.push({ class: classRaw, flags });
  }
  return rules;
}

function parseAutostart(text) {
  const items = [];
  const bspcPattern = /^bspc\s/;
  const commentPattern = /^\s*#/;
  const blankPattern = /^\s*$/;
  const shebangPattern = /^#!\s*/;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || blankPattern.test(trimmed)) continue;
    if (commentPattern.test(trimmed) && !shebangPattern.test(trimmed)) continue;
    if (bspcPattern.test(trimmed)) continue;
    if (shebangPattern.test(trimmed)) continue;
    items.push(trimmed.replace(/\s*&\s*$/, ''));
  }
  return items;
}

function colorSwatch(hex) {
  if (!hex) return '';
  const clean = hex.replace(/^["']|["']$/g, '').trim();
  if (!/^#[0-9a-fA-F]{3,8}$/.test(clean)) return '';
  return '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:' + esc(clean) + ';border:1px solid rgba(0,0,0,.2);vertical-align:middle;margin-right:4px"></span>';
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'bspwmrc-doc';
  const text = intake.text || '';

  const monitors = parseMonitors(text);
  const cfg = parseConfig(text);
  const rules = parseRules(text);
  const autostart = parseAutostart(text);

  const badge = '<span class="bspwmrc-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#1d1f21;color:#fff;font-weight:700;font-size:0.85em">bspwm</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + ' <span style="font-weight:600">bspwm Config</span></div>';
  html += '<div class="pj-meta">';
  if (monitors.length) html += '<span class="pj-tag">' + monitors.length + ' monitor' + (monitors.length !== 1 ? 's' : '') + '</span>';
  const totalDesktops = monitors.reduce((s, m) => s + m.desktops.length, 0);
  if (totalDesktops) html += '<span class="pj-tag">' + totalDesktops + ' desktop' + (totalDesktops !== 1 ? 's' : '') + '</span>';
  if (rules.length) html += '<span class="pj-tag">' + rules.length + ' rule' + (rules.length !== 1 ? 's' : '') + '</span>';
  if (autostart.length) html += '<span class="pj-tag">' + autostart.length + ' autostart</span>';
  html += '</div></header>';

  // Monitors & desktops
  if (monitors.length) {
    html += '<section class="kf-svc"><h3>Monitors & Desktops</h3>';
    for (const mon of monitors) {
      html += '<div style="margin-bottom:8px"><span style="font-weight:600;margin-right:8px">' + esc(mon.name) + '</span>';
      html += mon.desktops.map((d) => '<span class="kf-tag" style="background:var(--bg2,#f0f0f0)">' + esc(d) + '</span>').join(' ');
      html += '</div>';
    }
    html += '</section>';
  }

  // Layout settings
  const borderKeys = ['border_width', 'window_gap', 'split_ratio'];
  const paddingKeys = ['top_padding', 'right_padding', 'bottom_padding', 'left_padding'];
  const colorKeys = ['normal_border_color', 'active_border_color', 'focused_border_color', 'presel_feedback_color'];
  const behaviorKeys = ['single_monocle', 'click_to_focus', 'focus_follows_pointer', 'borderless_monocle', 'gapless_monocle'];

  const borderEntries = borderKeys.filter((k) => cfg[k] !== undefined);
  if (borderEntries.length) {
    html += '<section class="kf-svc"><h3>Layout</h3><ul class="kf-list">';
    for (const k of borderEntries) {
      html += '<li class="kf-pat"><code class="ts-key">' + esc(k) + '</code>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(cfg[k]) + '</span></li>';
    }
    html += '</ul></section>';
  }

  // Colors
  const colorEntries = colorKeys.filter((k) => cfg[k] !== undefined);
  if (colorEntries.length) {
    html += '<section class="kf-svc"><h3>Colors</h3><ul class="kf-list">';
    for (const k of colorEntries) {
      html += '<li class="kf-pat"><code class="ts-key">' + esc(k) + '</code>'
        + '<span style="flex:1;padding-left:8px;display:flex;align-items:center">'
        + colorSwatch(cfg[k]) + '<span style="color:var(--fg2,#777)">' + esc(cfg[k]) + '</span></span></li>';
    }
    html += '</ul></section>';
  }

  // Behavior
  const behaviorEntries = behaviorKeys.filter((k) => cfg[k] !== undefined);
  if (behaviorEntries.length) {
    html += '<section class="kf-svc"><h3>Behavior</h3><div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">';
    for (const k of behaviorEntries) {
      const val = cfg[k];
      const isBool = val === 'true' || val === 'false';
      const color = isBool ? (val === 'true' ? '#27ae60' : '#888') : '#4c7899';
      html += '<span class="kf-tag" style="background:' + color + ';color:#fff">'
        + esc(k) + ': ' + esc(val) + '</span>';
    }
    html += '</div></section>';
  }

  // Padding
  const paddingEntries = paddingKeys.filter((k) => cfg[k] !== undefined);
  if (paddingEntries.length) {
    html += '<section class="kf-svc"><h3>Padding</h3><ul class="kf-list">';
    for (const k of paddingEntries) {
      html += '<li class="kf-pat"><code class="ts-key">' + esc(k) + '</code>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(cfg[k]) + '</span></li>';
    }
    html += '</ul></section>';
  }

  // Rules
  if (rules.length) {
    html += '<section class="kf-svc"><h3>Window Rules <span class="pj-count">' + rules.length + '</span></h3><ul class="kf-list">';
    for (const rule of rules.slice(0, 8)) {
      html += '<li class="kf-pat"><code class="ts-key">' + esc(rule.class) + '</code>';
      if (rule.flags) html += '<span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777);font-size:0.9em">' + esc(rule.flags) + '</span>';
      html += '</li>';
    }
    if (rules.length > 8) html += '<li class="kf-pat" style="color:var(--fg2,#888);font-style:italic">… ' + (rules.length - 8) + ' more rule' + (rules.length - 8 !== 1 ? 's' : '') + '</li>';
    html += '</ul></section>';
  }

  // External rules command
  if (cfg['external_rules_command']) {
    html += '<section class="kf-svc"><h3>External Rules</h3>'
      + '<p style="margin:0;font-size:0.9em"><code>' + esc(cfg['external_rules_command']) + '</code></p></section>';
  }

  // Autostart
  if (autostart.length) {
    html += '<section class="kf-svc"><h3>Autostart <span class="pj-count">' + autostart.length + '</span></h3><ul class="kf-list">';
    for (const item of autostart) {
      html += '<li class="kf-pat"><code>' + esc(item.slice(0, 80)) + '</code></li>';
    }
    html += '</ul></section>';
  }

  if (!monitors.length && !rules.length && Object.keys(cfg).length === 0) {
    html += '<p class="kf-note">No bspwm configuration directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
