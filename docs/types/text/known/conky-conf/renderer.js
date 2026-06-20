const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.conky-doc { padding: 16px 18px; max-width: 880px; margin: 0 auto; font: 14px/1.55 system-ui, sans-serif; color: var(--fg, #24292f); }
.conky-doc .ck-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; background: #3a86ff; color: #fff; vertical-align: middle; margin-right: 8px; }
.conky-doc .ck-title { font-size: 18px; font-weight: 700; margin: 0 0 3px; }
.conky-doc .ck-sub { font-size: 12px; color: var(--fg-2, #888); margin: 0 0 16px; }
.conky-doc .ck-card { border: 1px solid var(--border, #e0e0e0); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
.conky-doc .ck-card h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-2, #666); margin: 0 0 8px; }
.conky-doc .ck-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px 16px; }
.conky-doc .ck-kv { display: flex; gap: 6px; font-size: 12px; align-items: baseline; }
.conky-doc .ck-key { font-family: ui-monospace, monospace; color: var(--fg-2, #666); min-width: 120px; flex-shrink: 0; }
.conky-doc .ck-val { font-family: ui-monospace, monospace; font-weight: 600; }
.conky-doc .ck-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.conky-doc .ck-chip { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 10px; font-size: 12px; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); font-family: ui-monospace, monospace; }
.conky-doc .ck-var-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.conky-doc .ck-var { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: #3a86ff22; border: 1px solid #3a86ff44; font-family: ui-monospace, monospace; color: #2c6fd1; }
`;

/**
 * Parse `conky.config = { ... }` block into a key/value map.
 * Values may be bare words, numbers, or quoted strings.
 */
function parseConkyConfig(text) {
  const cfgMatch = text.match(/conky\.config\s*=\s*\{([\s\S]*?)\}/);
  if (!cfgMatch) return {};
  const block = cfgMatch[1];
  const result = {};
  // Match:  key = 'value', or key = value,
  const re = /^\s*(\w+)\s*=\s*'([^']*)'|^\s*(\w+)\s*=\s*"([^"]*)"|^\s*(\w+)\s*=\s*([^,\n]+)/gm;
  let m;
  while ((m = re.exec(block)) !== null) {
    const key = m[1] || m[3] || m[5];
    const val = (m[2] !== undefined ? m[2] : m[4] !== undefined ? m[4] : m[6] || '').trim();
    if (key) result[key] = val;
  }
  return result;
}

/**
 * Extract unique $variable names from conky.text block (skip ${...} complex ones,
 * just get the base variable name).
 */
function parseConkyVars(text) {
  const txtMatch = text.match(/conky\.text\s*=\s*\[\[([\s\S]*?)\]\]/);
  if (!txtMatch) return [];
  const block = txtMatch[1];
  const vars = new Set();
  // Simple $var
  const simpleRe = /\$([a-zA-Z_]\w*)/g;
  let m;
  while ((m = simpleRe.exec(block)) !== null) {
    if (m[1] !== 'color' && m[1] !== 'hr') vars.add(m[1]);
  }
  // ${var ...} complex forms — extract base name
  const complexRe = /\$\{([a-zA-Z_]\w*)/g;
  while ((m = complexRe.exec(block)) !== null) {
    vars.add(m[1]);
  }
  return [...vars].sort();
}

function kv(key, val) {
  if (val == null || val === '') return '';
  return `<div class="ck-kv"><span class="ck-key">${esc(key)}</span><span class="ck-val">${esc(val)}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const cfg = parseConkyConfig(text);
  const vars = parseConkyVars(text);

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'conky.conf';

  // Categorize vars
  const varCategories = {
    CPU: vars.filter((v) => /^(cpu|freq|top|process)/.test(v)),
    Memory: vars.filter((v) => /^(mem|swap)/.test(v)),
    Network: vars.filter((v) => /^(up|down|net|eth|ip)/.test(v)),
    System: vars.filter((v) => /^(uptime|sysname|nodename|kernel|machine|conky)/.test(v)),
    Filesystem: vars.filter((v) => /^(fs_|disk)/.test(v)),
  };
  const categorized = new Set(Object.values(varCategories).flat());
  const other = vars.filter((v) => !categorized.has(v));

  // Window settings
  const windowEntries = [
    kv('alignment', cfg.alignment),
    kv('own_window_type', cfg.own_window_type),
    kv('gap_x', cfg.gap_x),
    kv('gap_y', cfg.gap_y),
    kv('font', cfg.font),
    kv('own_window_class', cfg.own_window_class),
  ].filter(Boolean).join('');

  // Display settings as chips
  const displayChips = [
    cfg.draw_borders !== undefined && `draw_borders: ${cfg.draw_borders}`,
    cfg.draw_shades !== undefined && `draw_shades: ${cfg.draw_shades}`,
    cfg.double_buffer !== undefined && `double_buffer: ${cfg.double_buffer}`,
    cfg.update_interval !== undefined && `update_interval: ${cfg.update_interval}`,
    cfg.use_xft !== undefined && `use_xft: ${cfg.use_xft}`,
    cfg.uppercase !== undefined && `uppercase: ${cfg.uppercase}`,
  ].filter(Boolean).map((s) => `<span class="ck-chip">${esc(s)}</span>`).join('');

  // Variable section
  const allVarGroups = Object.entries(varCategories)
    .filter(([, vs]) => vs.length > 0)
    .map(([cat, vs]) => `<strong style="font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em">${esc(cat)}</strong> ${vs.map((v) => `<span class="ck-var">$${esc(v)}</span>`).join(' ')}`).join('<br>');
  const otherVarsHtml = other.length ? `<br><strong style="font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em">Other</strong> ${other.map((v) => `<span class="ck-var">$${esc(v)}</span>`).join(' ')}` : '';

  const host = document.createElement('div');
  host.className = 'conky-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ck-title"><span class="ck-badge">Conky</span>${esc(filename)}</div>
<div class="ck-sub">System monitor overlay</div>
${windowEntries ? `<div class="ck-card"><h3>Window settings</h3><div class="ck-grid">${windowEntries}</div></div>` : ''}
${displayChips ? `<div class="ck-card"><h3>Display settings</h3><div class="ck-chips">${displayChips}</div></div>` : ''}
${vars.length ? `<div class="ck-card"><h3>Text template — ${vars.length} unique variable${vars.length !== 1 ? 's' : ''}</h3>${allVarGroups}${otherVarsHtml}</div>` : ''}`;

  return { parentNode: host };
}
