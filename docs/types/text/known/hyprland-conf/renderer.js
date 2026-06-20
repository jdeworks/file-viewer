const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hyprlcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hyprlcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00BFFF;color:#fff;vertical-align:middle;margin-right:8px;}
.hyprlcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hyprlcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.hyprlcfg-section{margin-bottom:14px;}
.hyprlcfg-section-hd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin-bottom:6px;}
.hyprlcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:8px;}
.hyprlcfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.hyprlcfg-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.hyprlcfg-table td:first-child{color:var(--fg-2,#888);width:38%;white-space:nowrap;font-family:ui-monospace,monospace;}
.hyprlcfg-table td:last-child{font-family:ui-monospace,monospace;}
.hyprlcfg-table tr:last-child td{border-bottom:none;}
.hyprlcfg-chip{display:inline-block;font-size:11px;font-family:ui-monospace,monospace;background:#e8f4fb;color:#005f87;border:1px solid #b3d9f0;border-radius:4px;padding:1px 7px;margin:1px 2px;}
.hyprlcfg-mod{display:inline-block;font-size:12px;font-family:ui-monospace,monospace;background:#fff3cd;color:#856404;border:1px solid #ffc107;border-radius:4px;padding:2px 9px;font-weight:600;}
.hyprlcfg-list{margin:0;padding:0 0 0 18px;font-size:12px;font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.hyprlcfg-list li{padding:1px 0;}
.hyprlcfg-stat{display:inline-block;background:var(--bg-3,#eaf0f7);border-radius:4px;padding:2px 10px;font-size:12px;margin:2px 4px 2px 0;}
.hyprlcfg-stat strong{color:var(--fg,#24292f);}
`;

function parseBlock(text, blockName) {
  // Extract first matching block {...}
  const re = new RegExp(blockName.replace('.', '\\.') + '\\s*\\{([^}]*)\\}', 's');
  const m = text.match(re);
  if (!m) return {};
  const result = {};
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    result[key] = val;
  }
  return result;
}

function parseMonitors(text) {
  const monitors = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('monitor=') || t.startsWith('#')) continue;
    const val = t.slice('monitor='.length);
    const parts = val.split(',');
    monitors.push({
      name: parts[0] || '',
      resolution: parts[1] || '',
      position: parts[2] || '',
      scale: parts[3] || '',
    });
  }
  return monitors;
}

function parseSimpleKey(text, key) {
  // e.g. $mainMod = SUPER or exec-once = waybar
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (k === key) return t.slice(eq + 1).trim();
  }
  return null;
}

function parseAllValues(text, key) {
  const results = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (k === key) results.push(t.slice(eq + 1).trim());
  }
  return results;
}

function parseBindings(text) {
  const bindings = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    // bind = MOD, KEY, DISPATCH, ARGS  or  bindm = MOD, KEY, DISPATCH
    if (/^bindm?\s*=/.test(t)) {
      const val = t.replace(/^bindm?\s*=\s*/, '');
      const parts = val.split(',').map((p) => p.trim());
      bindings.push({ dispatch: parts[2] || '', raw: val });
    }
  }
  return bindings;
}

function parseWindowRules(text) {
  let count = 0;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    if (t.startsWith('windowrulev2') || t.startsWith('windowrule')) count++;
  }
  return count;
}

function parseEnvVars(text) {
  const vars = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    if (t.startsWith('env =')) {
      const val = t.slice('env ='.length).trim();
      const comma = val.indexOf(',');
      if (comma >= 0) {
        vars.push({ name: val.slice(0, comma).trim(), value: val.slice(comma + 1).trim() });
      }
    }
  }
  return vars;
}

export function render(intake) {
  const text = intake.text || '';

  const monitors = parseMonitors(text);
  const mainMod = parseSimpleKey(text, '$mainMod');
  const execOnce = parseAllValues(text, 'exec-once');
  const execReload = parseAllValues(text, 'exec');
  const general = parseBlock(text, 'general');
  const decoration = parseBlock(text, 'decoration');
  const blur = parseBlock(text, 'blur');
  const animations = parseBlock(text, 'animations');
  const input = parseBlock(text, 'input');
  const bindings = parseBindings(text);
  const windowRules = parseWindowRules(text);
  const envVars = parseEnvVars(text);

  // Categorize bindings by dispatch type
  const dispatchCounts = {};
  for (const b of bindings) {
    const d = b.dispatch || 'other';
    dispatchCounts[d] = (dispatchCounts[d] || 0) + 1;
  }

  // Monitors table
  let monitorsHtml = '';
  if (monitors.length) {
    const rows = monitors.map((m) =>
      `<tr>
        <td>${esc(m.name || '(auto)')}</td>
        <td>${esc(m.resolution)}</td>
        <td>${esc(m.position)}</td>
        <td>${esc(m.scale)}</td>
      </tr>`
    ).join('');
    monitorsHtml = `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Monitors (${monitors.length})</div>
  <div class="hyprlcfg-card">
    <table class="hyprlcfg-table">
      <thead><tr style="font-size:11px;color:var(--fg-2,#888);">
        <td>Name</td><td>Resolution</td><td>Position</td><td>Scale</td>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
  }

  // mainMod chip
  const mainModHtml = mainMod
    ? `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Modifier Key</div>
  <div><span class="hyprlcfg-mod">${esc(mainMod)}</span></div>
</div>`
    : '';

  // General settings
  const generalRows = [];
  if (general.gaps_in) generalRows.push(`<tr><td>gaps_in</td><td>${esc(general.gaps_in)}</td></tr>`);
  if (general.gaps_out) generalRows.push(`<tr><td>gaps_out</td><td>${esc(general.gaps_out)}</td></tr>`);
  if (general.border_size) generalRows.push(`<tr><td>border_size</td><td>${esc(general.border_size)}</td></tr>`);
  if (general.layout) generalRows.push(`<tr><td>layout</td><td>${esc(general.layout)}</td></tr>`);
  if (general['col.active_border']) generalRows.push(`<tr><td>col.active_border</td><td>${esc(general['col.active_border'])}</td></tr>`);
  const generalHtml = generalRows.length ? `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">General</div>
  <div class="hyprlcfg-card">
    <table class="hyprlcfg-table"><tbody>${generalRows.join('')}</tbody></table>
  </div>
</div>` : '';

  // Decoration
  const decoRows = [];
  if (decoration.rounding) decoRows.push(`<tr><td>rounding</td><td>${esc(decoration.rounding)} px</td></tr>`);
  const blurEnabled = blur.enabled || decoration['blur.enabled'];
  if (blurEnabled) decoRows.push(`<tr><td>blur</td><td>${blurEnabled === 'true' || blurEnabled === 'yes' ? 'enabled' : 'disabled'}</td></tr>`);
  if (decoration.active_opacity) decoRows.push(`<tr><td>active_opacity</td><td>${esc(decoration.active_opacity)}</td></tr>`);
  if (decoration.inactive_opacity) decoRows.push(`<tr><td>inactive_opacity</td><td>${esc(decoration.inactive_opacity)}</td></tr>`);
  const decoHtml = decoRows.length ? `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Decoration</div>
  <div class="hyprlcfg-card">
    <table class="hyprlcfg-table"><tbody>${decoRows.join('')}</tbody></table>
  </div>
</div>` : '';

  // Startup apps
  let startupHtml = '';
  if (execOnce.length || execReload.length) {
    const onceItems = execOnce.map((e) => `<li>${esc(e)}</li>`).join('');
    const reloadItems = execReload.map((e) => `<li>${esc(e)} <span style="font-size:10px;color:var(--fg-2,#888)">(each reload)</span></li>`).join('');
    startupHtml = `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Startup Applications</div>
  <div class="hyprlcfg-card">
    <ul class="hyprlcfg-list">${onceItems}${reloadItems}</ul>
  </div>
</div>`;
  }

  // Keybindings summary
  let bindingsHtml = '';
  if (bindings.length) {
    const topDispatches = Object.entries(dispatchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([d, c]) => `<span class="hyprlcfg-stat"><strong>${c}</strong> ${esc(d)}</span>`)
      .join('');
    bindingsHtml = `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Keybindings (${bindings.length} total)</div>
  <div class="hyprlcfg-card">${topDispatches}</div>
</div>`;
  }

  // Window rules
  const windowRulesHtml = windowRules
    ? `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Window Rules</div>
  <div class="hyprlcfg-card"><span class="hyprlcfg-stat"><strong>${windowRules}</strong> rule${windowRules !== 1 ? 's' : ''}</span></div>
</div>`
    : '';

  // Environment variables
  let envHtml = '';
  if (envVars.length) {
    const rows = envVars.map((v) =>
      `<tr><td>${esc(v.name)}</td><td>${esc(v.value)}</td></tr>`
    ).join('');
    envHtml = `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Environment Variables (${envVars.length})</div>
  <div class="hyprlcfg-card">
    <table class="hyprlcfg-table"><tbody>${rows}</tbody></table>
  </div>
</div>`;
  }

  // Animations
  const animEnabled = animations.enabled;
  const animHtml = animEnabled ? `<div class="hyprlcfg-section">
  <div class="hyprlcfg-section-hd">Animations</div>
  <div class="hyprlcfg-card"><span class="hyprlcfg-stat">${animEnabled === 'true' || animEnabled === 'yes' ? 'Enabled' : 'Disabled'}</span></div>
</div>` : '';

  const host = document.createElement('div');
  host.className = 'hyprlcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hyprlcfg-title"><span class="hyprlcfg-badge">Hyprland</span>Hyprland Configuration</div>
<div class="hyprlcfg-sub">${monitors.length} monitor${monitors.length !== 1 ? 's' : ''}${mainMod ? ' · $mainMod = ' + esc(mainMod) : ''}${bindings.length ? ' · ' + bindings.length + ' bindings' : ''}</div>
${monitorsHtml}
${mainModHtml}
${generalHtml}
${decoHtml}
${animHtml}
${startupHtml}
${bindingsHtml}
${windowRulesHtml}
${envHtml}
`;

  return { parentNode: host };
}
