// Ranger terminal file manager rc.conf renderer.
// Parses `set option value`, `map key cmd`, `alias`, and `copymap` lines.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rangercfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.rangercfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a3d1a;color:#fff;vertical-align:middle;margin-right:8px}
.rangercfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rangercfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rangercfg-sec{margin:14px 0}
.rangercfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.rangercfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.rangercfg-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.rangercfg-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.rangercfg-chip-cyan{background:#ecfeff;border-color:#a5f3fc;color:#0e7490}
.rangercfg-chip-orange{background:#fff7ed;border-color:#fdba74;color:#c2410c}
.rangercfg-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.rangercfg-table{width:100%;border-collapse:collapse;font-size:13px}
.rangercfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.rangercfg-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.rangercfg-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.rangercfg-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
.rangercfg-map-list{margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px}
.rangercfg-map-item{display:flex;gap:8px;font:12px/1.4 ui-monospace,monospace}
.rangercfg-map-key{font-weight:700;color:#1a3d1a;min-width:120px;white-space:nowrap}
.rangercfg-map-cmd{color:var(--fg-2,#666);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;

function parseRanger(text) {
  const lines = text.split('\n');
  const settings = {};
  const maps = [];
  let aliasCount = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // set <option> <value>
    const setMatch = line.match(/^set\s+(\S+)\s+(.+)$/);
    if (setMatch) {
      settings[setMatch[1].toLowerCase()] = setMatch[2].trim();
      continue;
    }

    // map <key> <cmd>
    const mapMatch = line.match(/^map\s+(\S+)\s+(.+)$/);
    if (mapMatch) {
      maps.push({ key: mapMatch[1], cmd: mapMatch[2].trim() });
      continue;
    }

    // copymap <from> <to> — count as a map
    const copymapMatch = line.match(/^copymap\s+(\S+)\s+(\S+)/);
    if (copymapMatch) {
      maps.push({ key: copymapMatch[2], cmd: 'copymap ' + copymapMatch[1] });
      continue;
    }

    // alias
    if (/^alias\s+/.test(line)) {
      aliasCount++;
    }
  }

  return { settings, maps, aliasCount };
}

function boolChip(val, label, prefix) {
  if (val == null) return '';
  const isTrue = val === 'true';
  const cls = isTrue ? `${prefix}-chip-green` : `${prefix}-chip-gray`;
  return `<span class="${prefix}-chip ${cls}">${esc(label)}: ${esc(val)}</span>`;
}

function chip(val, label, prefix) {
  if (val == null) return '';
  return `<span class="${prefix}-chip ${prefix}-chip-gray">${esc(label)}: ${esc(val)}</span>`;
}

function previewImagesMethodChip(val, prefix) {
  if (!val) return '';
  const map = { kitty: `${prefix}-chip-cyan`, ueberzug: `${prefix}-chip-orange`, w3m: `${prefix}-chip-gray` };
  const cls = map[val] || `${prefix}-chip-gray`;
  return `<span class="${prefix}-chip ${cls}">preview method: ${esc(val)}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { settings: s, maps, aliasCount } = parseRanger(text);

  const p = 'rangercfg';
  const parts = [];

  // Display card
  const displayChips = [
    s['column_ratios'] ? `<span class="${p}-chip ${p}-chip-gray">column_ratios: ${esc(s['column_ratios'])}</span>` : '',
    boolChip(s['show_hidden'], 'show_hidden', p),
    boolChip(s['preview_files'], 'preview_files', p),
    boolChip(s['preview_directories'], 'preview_directories', p),
    boolChip(s['preview_images'], 'preview_images', p),
    previewImagesMethodChip(s['preview_images_method'], p),
    boolChip(s['unicode_ellipsis'], 'unicode_ellipsis', p),
    boolChip(s['draw_borders'], 'draw_borders', p),
    boolChip(s['vcs_aware'], 'vcs_aware', p),
  ].filter(Boolean).join('');

  if (displayChips) {
    parts.push(`<div class="${p}-sec"><h3>Display</h3><div class="${p}-chips">${displayChips}</div></div>`);
  }

  // Behavior card
  const behaviorRows = [];
  if (s['scroll_offset']) behaviorRows.push(`<tr><td class="${p}-key">scroll_offset</td><td><span class="${p}-val">${esc(s['scroll_offset'])}</span></td></tr>`);
  if (s['max_history_size']) behaviorRows.push(`<tr><td class="${p}-key">max_history_size</td><td><span class="${p}-val">${esc(s['max_history_size'])}</span></td></tr>`);
  if (s['editor']) behaviorRows.push(`<tr><td class="${p}-key">editor</td><td><span class="${p}-val">${esc(s['editor'])}</span></td></tr>`);
  if (s['shell']) behaviorRows.push(`<tr><td class="${p}-key">shell</td><td><span class="${p}-val">${esc(s['shell'])}</span></td></tr>`);

  const behaviorChips = [
    boolChip(s['autosave_bookmarks'], 'autosave_bookmarks', p),
    boolChip(s['save_console_history'], 'save_console_history', p),
    boolChip(s['open_all_images'], 'open_all_images', p),
    boolChip(s['mouse_enabled'], 'mouse_enabled', p),
    boolChip(s['tilde_in_titlebar'], 'tilde_in_titlebar', p),
  ].filter(Boolean).join('');

  if (behaviorRows.length || behaviorChips) {
    let inner = '';
    if (behaviorRows.length) inner += `<table class="${p}-table"><tbody>${behaviorRows.join('')}</tbody></table>`;
    if (behaviorChips) inner += `<div class="${p}-chips" style="margin-top:${behaviorRows.length ? '8px' : '4px'}">${behaviorChips}</div>`;
    parts.push(`<div class="${p}-sec"><h3>Behavior</h3>${inner}</div>`);
  }

  // Key bindings card
  if (maps.length) {
    const shown = maps.slice(0, 6);
    const extra = maps.length > 6 ? maps.length - 6 : 0;
    const items = shown.map((m) =>
      `<li class="${p}-map-item"><span class="${p}-map-key">${esc(m.key)}</span><span class="${p}-map-cmd">${esc(m.cmd)}</span></li>`
    ).join('');
    const extraNote = extra ? `<li class="${p}-map-item" style="color:var(--fg-2,#888);font-style:italic">…and ${extra} more</li>` : '';
    parts.push(`<div class="${p}-sec"><h3>Key Bindings (${maps.length} total)</h3><ul class="${p}-map-list">${items}${extraNote}</ul></div>`);
  }

  // Aliases summary
  if (aliasCount) {
    parts.push(`<div class="${p}-sec"><h3>Aliases</h3><div class="${p}-chips"><span class="${p}-chip ${p}-chip-gray">${aliasCount} alias${aliasCount !== 1 ? 'es' : ''}</span></div></div>`);
  }

  const sub = [
    s['column_ratios'] ? `cols: ${s['column_ratios']}` : null,
    maps.length ? `${maps.length} mappings` : null,
    aliasCount ? `${aliasCount} aliases` : null,
  ].filter(Boolean).join(' · ') || 'Ranger configuration';

  const host = document.createElement('div');
  host.className = `${p}-doc`;
  host.innerHTML = `<style>${CSS}</style>
<div class="${p}-title"><span class="${p}-badge">Ranger</span>Ranger Config</div>
<div class="${p}-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
