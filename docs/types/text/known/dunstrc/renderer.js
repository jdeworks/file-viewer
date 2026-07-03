// dunst notification daemon config renderer. Pure text parsing — no eval, no execution.
// Parses INI sections: [global], [urgency_*], [shortcuts], and custom [app *] rules.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseIni(text) {
  const sections = {};
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch) {
      current = secMatch[1].trim();
      if (!sections[current]) sections[current] = {};
      continue;
    }
    if (current) {
      const kv = line.match(/^([^=]+?)\s*=\s*(.*)$/);
      if (kv) sections[current][kv[1].trim()] = kv[2].trim();
    }
  }
  return sections;
}

function colorSwatch(hex) {
  const clean = String(hex || '').trim();
  if (!/^#[0-9a-fA-F]{3,8}$/.test(clean)) return '';
  return '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:' + clean + ';border:1px solid rgba(0,0,0,.25);margin-right:5px;vertical-align:middle"></span>';
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'dunstrc-doc';
  const text = intake.text || '';

  const sections = parseIni(text);
  const global = sections['global'] || {};
  const urgLow = sections['urgency_low'] || {};
  const urgNormal = sections['urgency_normal'] || {};
  const urgCritical = sections['urgency_critical'] || {};
  const shortcuts = sections['shortcuts'] || {};

  // Count custom app rules
  const appRules = Object.keys(sections).filter((s) => s !== 'global' && s !== 'urgency_low' && s !== 'urgency_normal' && s !== 'urgency_critical' && s !== 'shortcuts' && s !== 'experimental');

  const badge = '<span class="dunstrc-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#2D3436;color:#fff;font-weight:700;font-size:0.85em">dunst</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge;
  const font = global.font;
  if (font) html += ' <span class="kf-tag">' + esc(font) + '</span>';
  html += '</div><div class="pj-meta">';
  if (global.notification_limit) html += '<span class="pj-tag">limit: ' + esc(global.notification_limit) + '</span>';
  if (global.markup) html += '<span class="pj-tag">markup: ' + esc(global.markup) + '</span>';
  if (appRules.length) html += '<span class="pj-tag">' + appRules.length + ' app rule' + (appRules.length !== 1 ? 's' : '') + '</span>';
  html += '</div></header>';

  // Global settings card
  const globalKeys = ['monitor', 'follow', 'width', 'height', 'origin', 'offset', 'transparency', 'corner_radius', 'frame_width', 'frame_color', 'sort', 'idle_threshold', 'show_age_threshold', 'word_wrap', 'stack_duplicates', 'history_length', 'dmenu', 'browser', 'max_icon_size'];
  const globalRows = globalKeys.filter((k) => global[k] != null).map((k) =>
    '<li class="kf-pat"><code class="ts-key">' + esc(k) + '</code><span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(global[k]) + '</span></li>'
  ).join('');
  if (globalRows) {
    html += '<section class="kf-svc"><h3>Global Settings</h3><ul class="kf-list">' + globalRows + '</ul></section>';
  }

  // Urgency cards
  const urgencies = [
    { key: 'urgency_low', label: 'Low', data: urgLow },
    { key: 'urgency_normal', label: 'Normal', data: urgNormal },
    { key: 'urgency_critical', label: 'Critical', data: urgCritical },
  ];
  const hasUrgency = urgencies.some((u) => Object.keys(u.data).length > 0);
  if (hasUrgency) {
    html += '<section class="kf-svc"><h3>Urgency Levels</h3><div style="display:flex;gap:12px;flex-wrap:wrap;padding:4px 0">';
    for (const { label, data } of urgencies) {
      if (!Object.keys(data).length) continue;
      const bg = (data.background || '').replace(/"/g, '');
      const fg = (data.foreground || '').replace(/"/g, '');
      const timeout = data.timeout;
      html += '<div style="flex:1;min-width:160px;border:1px solid var(--border,#ddd);border-radius:6px;padding:10px">';
      html += '<div style="font-weight:600;margin-bottom:6px">' + esc(label) + '</div>';
      if (bg) html += '<div style="margin-bottom:4px">' + colorSwatch(bg) + '<span style="font-size:0.85em;color:var(--fg2,#777)">bg: ' + esc(bg) + '</span></div>';
      if (fg) html += '<div style="margin-bottom:4px">' + colorSwatch(fg) + '<span style="font-size:0.85em;color:var(--fg2,#777)">fg: ' + esc(fg) + '</span></div>';
      if (timeout != null) html += '<div><span class="kf-tag">timeout: ' + esc(timeout) + 's</span></div>';
      html += '</div>';
    }
    html += '</div></section>';
  }

  // Keyboard shortcuts
  const shortcutKeys = Object.keys(shortcuts);
  if (shortcutKeys.length) {
    const rows = shortcutKeys.map((k) =>
      '<li class="kf-pat"><code class="ts-key">' + esc(k) + '</code><span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(shortcuts[k]) + '</span></li>'
    ).join('');
    html += '<section class="kf-svc"><h3>Keyboard Shortcuts <span class="pj-count">' + shortcutKeys.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>';
  }

  // App rules
  if (appRules.length) {
    const rows = appRules.map((name) => {
      const rule = sections[name];
      const parts = [];
      if (rule.appname) parts.push('appname: ' + rule.appname);
      if (rule.urgency) parts.push('urgency: ' + rule.urgency);
      if (rule.timeout) parts.push('timeout: ' + rule.timeout + 's');
      if (rule.summary) parts.push('summary: ' + rule.summary);
      return '<li class="kf-pat"><code class="ts-key">' + esc(name) + '</code><span class="ts-doc" style="flex:1;padding-left:8px;color:var(--fg2,#777)">' + esc(parts.join(', ')) + '</span></li>';
    }).join('');
    html += '<section class="kf-svc"><h3>Application Rules <span class="pj-count">' + appRules.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>';
  }

  if (!globalRows && !hasUrgency && !shortcutKeys.length) {
    html += '<p class="kf-note">No dunst configuration directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
