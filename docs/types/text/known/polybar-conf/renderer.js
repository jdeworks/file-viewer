// Polybar status bar config renderer. Pure text parsing — no eval, no execution.
// Parses [colors], [bar/NAME], [module/NAME], and [settings] sections.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parsePolybarSections(text) {
  const colors = {};
  const bars = [];
  const modules = [];

  let currentSection = null;
  let currentData = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch) {
      const name = secMatch[1].trim();
      if (name === 'colors') {
        currentSection = 'colors';
        currentData = null;
      } else if (name.startsWith('bar/')) {
        const barName = name.slice(4);
        currentData = { name: barName, monitor: null, width: null, height: null, trayPosition: null, modulesLeft: [], modulesCenter: [], modulesRight: [] };
        bars.push(currentData);
        currentSection = 'bar';
      } else if (name.startsWith('module/')) {
        const modName = name.slice(7);
        currentData = { name: modName, type: null, exec: null, label: null };
        modules.push(currentData);
        currentSection = 'module';
      } else {
        currentSection = 'other';
        currentData = null;
      }
      continue;
    }

    const kv = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (!kv) continue;
    const k = kv[1].trim();
    const v = kv[2].trim();

    if (currentSection === 'colors') {
      colors[k] = v;
    } else if (currentSection === 'bar' && currentData) {
      if (k === 'monitor') currentData.monitor = v;
      else if (k === 'width') currentData.width = v;
      else if (k === 'height') currentData.height = v;
      else if (k === 'tray-position') currentData.trayPosition = v;
      else if (k === 'modules-left') currentData.modulesLeft = v.split(/\s+/).filter(Boolean);
      else if (k === 'modules-center') currentData.modulesCenter = v.split(/\s+/).filter(Boolean);
      else if (k === 'modules-right') currentData.modulesRight = v.split(/\s+/).filter(Boolean);
    } else if (currentSection === 'module' && currentData) {
      if (k === 'type') currentData.type = v;
      else if (k === 'exec') currentData.exec = v;
      else if (k === 'label') currentData.label = v;
    }
  }

  return { colors, bars, modules };
}

function moduleTypeChip(type) {
  if (!type) return '';
  const lower = type.toLowerCase();
  let color = '#888';
  if (lower.startsWith('internal/')) color = '#4c7899';
  else if (lower.startsWith('custom/script')) color = '#e67e22';
  else if (lower.startsWith('custom/')) color = '#27ae60';
  const short = type.replace(/^internal\//, '').replace(/^custom\//, '');
  return '<span class="kf-tag" style="background:' + color + ';color:#fff;font-size:0.78em">' + esc(short) + '</span>';
}

function resolveColor(val, colors) {
  // Resolve ${colors.name} references
  return val.replace(/\$\{colors\.(\w[\w-]*)\}/g, (_, name) => colors[name] || _);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'polybarcfg-doc';
  const text = intake.text || '';

  const { colors, bars, modules } = parsePolybarSections(text);

  const badge = '<span class="polybarcfg-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#3D3D3D;color:#fff;font-weight:700;font-size:0.85em">Polybar</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + '</div><div class="pj-meta">';
  if (bars.length) html += '<span class="pj-tag">' + bars.length + ' bar' + (bars.length !== 1 ? 's' : '') + '</span>';
  if (modules.length) html += '<span class="pj-tag">' + modules.length + ' module' + (modules.length !== 1 ? 's' : '') + '</span>';
  if (Object.keys(colors).length) html += '<span class="pj-tag">' + Object.keys(colors).length + ' color' + (Object.keys(colors).length !== 1 ? 's' : '') + '</span>';
  html += '</div></header>';

  // Bars section
  if (bars.length) {
    html += '<section class="kf-svc"><h3>Bars <span class="pj-count">' + bars.length + '</span></h3>';
    for (const bar of bars) {
      html += '<div style="border:1px solid var(--border,#ddd);border-radius:6px;padding:10px;margin-bottom:8px">';
      html += '<div style="font-weight:600;margin-bottom:6px">' + esc(bar.name) + '</div>';
      html += '<ul class="kf-list">';
      if (bar.monitor) html += '<li class="kf-pat"><code class="ts-key">monitor</code><span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(bar.monitor) + '</span></li>';
      if (bar.width) html += '<li class="kf-pat"><code class="ts-key">width</code><span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(bar.width) + '</span></li>';
      if (bar.height) html += '<li class="kf-pat"><code class="ts-key">height</code><span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(bar.height) + '</span></li>';
      if (bar.trayPosition) html += '<li class="kf-pat"><code class="ts-key">tray-position</code><span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(bar.trayPosition) + '</span></li>';
      const allMods = [...bar.modulesLeft.map((m) => ({ name: m, pos: 'left' })), ...bar.modulesCenter.map((m) => ({ name: m, pos: 'center' })), ...bar.modulesRight.map((m) => ({ name: m, pos: 'right' }))];
      if (allMods.length) {
        html += '<li class="kf-pat"><code class="ts-key">modules</code><span style="flex:1;padding-left:8px">' + allMods.map((m) => '<span class="kf-tag">' + esc(m.name) + '</span>').join(' ') + '</span></li>';
      }
      html += '</ul></div>';
    }
    html += '</section>';
  }

  // Modules table
  if (modules.length) {
    html += '<section class="kf-svc"><h3>Modules <span class="pj-count">' + modules.length + '</span></h3>';
    html += '<ul class="kf-list">';
    for (const mod of modules) {
      html += '<li class="kf-pat"><code class="ts-key">' + esc(mod.name) + '</code>';
      html += '<span style="padding-left:8px">' + moduleTypeChip(mod.type) + '</span>';
      if (mod.exec) html += '<span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777);font-size:0.85em">' + esc(mod.exec.slice(0, 60)) + '</span>';
      else if (mod.label) html += '<span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777);font-size:0.85em">' + esc(mod.label.slice(0, 60)) + '</span>';
      html += '</li>';
    }
    html += '</ul></section>';
  }

  // Colors palette
  const colorEntries = Object.entries(colors).slice(0, 8);
  if (colorEntries.length) {
    html += '<section class="kf-svc"><h3>Colors</h3><div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0">';
    for (const [name, val] of colorEntries) {
      const hex = val.replace(/"/g, '').trim();
      const isHex = /^#[0-9a-fA-F]{3,8}$/.test(hex);
      html += '<div style="display:flex;align-items:center;gap:6px;min-width:140px">';
      if (isHex) html += '<span style="display:inline-block;width:18px;height:18px;border-radius:3px;background:' + esc(hex) + ';border:1px solid rgba(0,0,0,.2)"></span>';
      html += '<span style="font-size:0.85em"><code>' + esc(name) + '</code></span>';
      html += '</div>';
    }
    html += '</div></section>';
  }

  if (!bars.length && !modules.length) {
    html += '<p class="kf-note">No Polybar configuration sections detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
