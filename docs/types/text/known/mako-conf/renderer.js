// mako Wayland notification daemon config renderer. Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.makocfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.makocfg-header{display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;}
.makocfg-badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#89b4fa;vertical-align:middle;}
.makocfg-title{font-size:18px;font-weight:700;margin:0;}
.makocfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.makocfg-section{margin-bottom:14px;border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;background:var(--bg-2,#f6f8fa);}
.makocfg-section-hd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 8px;}
.makocfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.makocfg-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;}
.makocfg-table td:first-child{color:var(--fg-2,#888);width:38%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.makocfg-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;}
.makocfg-table tr:last-child td{border-bottom:none;}
.makocfg-chip{display:inline-block;font-size:11px;font-family:ui-monospace,monospace;background:#e8f4fb;color:#005f87;border:1px solid #b3d9f0;border-radius:4px;padding:1px 7px;margin:1px 2px;}
.makocfg-chip.anchor-tr{background:#d1fae5;color:#065f46;border-color:#6ee7b7;}
.makocfg-chip.anchor-other{background:#e0e7ff;color:#3730a3;border-color:#a5b4fc;}
.makocfg-swatch{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.2);vertical-align:middle;margin-right:4px;}
.makocfg-criteria{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.makocfg-criteria-chip{display:inline-block;font-size:11px;font-family:ui-monospace,monospace;background:var(--bg-3,#eaf0f7);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;}
`;

// Parse flat key=value pairs (global section, before any [...] section header)
function parseGlobal(text) {
  const kv = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.startsWith('[')) break; // stop at first section
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    kv[k] = v;
  }
  return kv;
}

// Parse criteria section headers like [urgency=low], [app-name="Spotify"], [mode=do-not-disturb]
function parseCriteriaSections(text) {
  const sections = [];
  const lines = text.split('\n');
  let inGlobal = true;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const secMatch = t.match(/^\[(.+)\]$/);
    if (secMatch) {
      inGlobal = false;
      sections.push(secMatch[1].trim());
    } else if (inGlobal && t.includes('=')) {
      // still in global
    }
  }
  return sections;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'makocfg-doc';
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseGlobal(text);
  const criteria = parseCriteriaSections(text);

  let html = '';

  // Header
  html += '<div class="makocfg-header"><span class="makocfg-badge">mako</span><span class="makocfg-title">mako notification daemon</span></div>';
  html += '<p class="makocfg-sub">Wayland notification daemon configuration</p>';

  // Global settings card
  const settingRows = [];
  const anchor = cfg['anchor'];
  if (anchor) {
    const chipClass = anchor === 'top-right' ? 'anchor-tr' : 'anchor-other';
    settingRows.push(['anchor', '<span class="makocfg-chip ' + chipClass + '">' + esc(anchor) + '</span>']);
  }
  if (cfg['margin']) settingRows.push(['margin', esc(cfg['margin'])]);
  if (cfg['padding']) settingRows.push(['padding', esc(cfg['padding'])]);
  if (cfg['max-visible']) settingRows.push(['max-visible', esc(cfg['max-visible'])]);
  if (cfg['sort']) settingRows.push(['sort', esc(cfg['sort'])]);
  if (cfg['layer']) settingRows.push(['layer', esc(cfg['layer'])]);
  if (cfg['default-timeout'] != null) {
    const ms = parseInt(cfg['default-timeout'], 10);
    const display = !isNaN(ms) && ms >= 1000 ? (ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1) + 's' : esc(cfg['default-timeout']) + 'ms';
    settingRows.push(['default-timeout', display]);
  }
  if (cfg['ignore-timeout'] != null) settingRows.push(['ignore-timeout', esc(cfg['ignore-timeout'])]);

  if (settingRows.length) {
    html += '<section class="makocfg-section"><div class="makocfg-section-hd">Global Settings</div>';
    html += '<table class="makocfg-table">';
    for (const [k, v] of settingRows) html += '<tr><td>' + esc(k) + '</td><td>' + v + '</td></tr>';
    html += '</table></section>';
  }

  // Appearance card
  const appearRows = [];

  function colorRow(key, label) {
    const val = cfg[key];
    if (!val) return;
    const hexM = val.match(/#[0-9a-fA-F]{3,8}/);
    let display = esc(val);
    if (hexM) display = '<span class="makocfg-swatch" style="background:' + esc(hexM[0]) + '"></span>' + esc(val);
    appearRows.push([label || key, display]);
  }

  colorRow('background-color');
  colorRow('text-color');
  colorRow('border-color');
  if (cfg['border-size']) appearRows.push(['border-size', esc(cfg['border-size']) + 'px']);
  if (cfg['border-radius']) appearRows.push(['border-radius', esc(cfg['border-radius']) + 'px']);
  if (cfg['font']) appearRows.push(['font', esc(cfg['font'])]);
  if (cfg['width']) appearRows.push(['width', esc(cfg['width']) + 'px']);
  if (cfg['height']) appearRows.push(['height', esc(cfg['height']) + 'px']);
  if (cfg['icons']) appearRows.push(['icons', cfg['icons'] === '1' ? 'enabled' : 'disabled']);
  if (cfg['max-icon-size']) appearRows.push(['max-icon-size', esc(cfg['max-icon-size']) + 'px']);

  if (appearRows.length) {
    html += '<section class="makocfg-section"><div class="makocfg-section-hd">Appearance</div>';
    html += '<table class="makocfg-table">';
    for (const [k, v] of appearRows) html += '<tr><td>' + esc(k) + '</td><td>' + v + '</td></tr>';
    html += '</table></section>';
  }

  // Criteria sections
  if (criteria.length) {
    html += '<section class="makocfg-section"><div class="makocfg-section-hd">Criteria Sections <span style="font-size:12px;font-weight:400;color:var(--fg-2,#888)">(' + criteria.length + ')</span></div>';
    html += '<div class="makocfg-criteria">';
    for (const c of criteria) html += '<span class="makocfg-criteria-chip">[' + esc(c) + ']</span>';
    html += '</div></section>';
  }

  if (!settingRows.length && !appearRows.length && !criteria.length) {
    html += '<p style="color:var(--fg-2,#888);font-size:13px">No mako configuration directives detected.</p>';
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  host.appendChild(wrapper);
  return { parentNode: host };
}
