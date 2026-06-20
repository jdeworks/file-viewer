// GNU nano .nanorc renderer — parses set/include/bind directives and shows structured cards.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nanorc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.nanorc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d6a9f;color:#fff;vertical-align:middle;margin-right:8px}
.nanorc-title{font-size:18px;font-weight:700;margin:0 0 2px}
.nanorc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.nanorc-head{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.nanorc-sec{margin:14px 0}
.nanorc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.nanorc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.nanorc-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.nanorc-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.nanorc-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#6b7280}
.nanorc-chip-val{margin-left:4px;color:var(--fg-2,#555);font-weight:400}
.nanorc-color-list{list-style:none;margin:4px 0 0;padding:0}
.nanorc-color-item{display:flex;gap:10px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0);font-size:13px}
.nanorc-color-item:last-child{border-bottom:none}
.nanorc-color-key{font-family:ui-monospace,monospace;font-weight:600;min-width:140px;color:var(--fg,#24292f)}
.nanorc-color-val{font-family:ui-monospace,monospace;color:var(--fg-2,#555)}
.nanorc-inc-list{list-style:none;margin:4px 0 0;padding:0}
.nanorc-inc-item{font-family:ui-monospace,monospace;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0);color:var(--fg,#24292f)}
.nanorc-inc-item:last-child{border-bottom:none}
.nanorc-table{width:100%;border-collapse:collapse;font-size:13px}
.nanorc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.nanorc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top}
.nanorc-table tr:last-child td{border-bottom:none}
.nanorc-mono{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.nanorc-ctx{font-size:11px;color:var(--fg-2,#888)}
`;

// Settings that are purely boolean (presence = enabled)
const BOOL_SETTINGS = new Set([
  'autoindent','tabstospaces','mouse','softwrap','linenumbers','historylog',
  'positionlog','backup','suspendable','smartindent','jumpyscrolling',
  'nohelp','quickblank','magic','multibuffer','rebinddelete','rebindkeypad',
  'wordbounds','nonewlines','trimblanks','afterends','atblanks',
]);

// Color-related settings
const COLOR_SETTINGS = new Set([
  'titlecolor','statuscolor','errorcolor','spotlightcolor','selectedcolor',
  'scrollercolor','functioncolor','keycolor','numbercolor','minicolor',
  'promptcolor',
]);

function parseNanorc(text) {
  const lines = text.split(/\r?\n/);
  const settings = new Map();   // key -> value (or true for bools)
  const includes = [];
  const bindings = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // include "path"
    const incMatch = line.match(/^include\s+"([^"]+)"/i);
    if (incMatch) { includes.push(incMatch[1]); continue; }

    // bind key command context
    const bindMatch = line.match(/^bind\s+(\S+)\s+(\S+)\s+(\S+)/i);
    if (bindMatch) {
      bindings.push({ key: bindMatch[1], command: bindMatch[2], context: bindMatch[3] });
      continue;
    }

    // set key [value]
    const setMatch = line.match(/^set\s+(\w+)(?:\s+"?([^"]*)"?)?/i);
    if (setMatch) {
      const key = setMatch[1].toLowerCase();
      const val = setMatch[2] ? setMatch[2].trim() : true;
      settings.set(key, val);
    }
  }

  return { settings, includes, bindings };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'nanorc-doc';

  const text = intake.text || '';
  const { settings, includes, bindings } = parseNanorc(text);

  const parts = [];

  // Header
  parts.push(`<style>${CSS}</style>`);
  parts.push(`<div class="nanorc-head"><span class="nanorc-badge">nano</span><div><div class="nanorc-title">.nanorc</div><div class="nanorc-sub">GNU nano editor config</div></div></div>`);

  // Behaviour settings card
  const behaviorKeys = ['autoindent','tabsize','tabstospaces','mouse','softwrap','linenumbers','wordchars'];
  const behaviorChips = [];
  for (const key of behaviorKeys) {
    if (!settings.has(key)) continue;
    const val = settings.get(key);
    if (val === true || val === '') {
      behaviorChips.push(`<span class="nanorc-chip nanorc-chip-green">${esc(key)}</span>`);
    } else {
      behaviorChips.push(`<span class="nanorc-chip nanorc-chip-green">${esc(key)}<span class="nanorc-chip-val">${esc(val)}</span></span>`);
    }
  }
  if (behaviorChips.length) {
    parts.push(`<div class="nanorc-sec"><h3>Behaviour</h3><div class="nanorc-chips">${behaviorChips.join('')}</div></div>`);
  }

  // History card
  const historyKeys = ['historylog','positionlog'];
  const historyChips = historyKeys.filter(k => settings.has(k)).map(k =>
    `<span class="nanorc-chip nanorc-chip-green">${esc(k)}</span>`
  );
  if (historyChips.length) {
    parts.push(`<div class="nanorc-sec"><h3>History</h3><div class="nanorc-chips">${historyChips.join('')}</div></div>`);
  }

  // Backup card
  if (settings.has('backup')) {
    const backupItems = [`<span class="nanorc-chip nanorc-chip-green">backup</span>`];
    if (settings.has('backupdir')) {
      backupItems.push(`<span class="nanorc-chip nanorc-chip-gray">backupdir<span class="nanorc-chip-val">${esc(settings.get('backupdir'))}</span></span>`);
    }
    parts.push(`<div class="nanorc-sec"><h3>Backup</h3><div class="nanorc-chips">${backupItems.join('')}</div></div>`);
  }

  // Color settings
  const colorEntries = [...settings.entries()].filter(([k]) => COLOR_SETTINGS.has(k));
  if (colorEntries.length) {
    const rows = colorEntries.map(([k, v]) =>
      `<li class="nanorc-color-item"><span class="nanorc-color-key">${esc(k)}</span><span class="nanorc-color-val">${esc(v === true ? '' : v)}</span></li>`
    ).join('');
    parts.push(`<div class="nanorc-sec"><h3>Colors</h3><ul class="nanorc-color-list">${rows}</ul></div>`);
  }

  // Syntax includes
  if (includes.length) {
    const items = includes.map(p => `<li class="nanorc-inc-item">${esc(p)}</li>`).join('');
    parts.push(`<div class="nanorc-sec"><h3>Syntax includes <span style="font-size:11px;font-weight:400;">(${includes.length})</span></h3><ul class="nanorc-inc-list">${items}</ul></div>`);
  }

  // Key bindings table
  if (bindings.length) {
    const rows = bindings.map(b =>
      `<tr><td class="nanorc-mono">${esc(b.key)}</td><td class="nanorc-mono">${esc(b.command)}</td><td class="nanorc-ctx">${esc(b.context)}</td></tr>`
    ).join('');
    parts.push(`<div class="nanorc-sec"><h3>Key bindings <span style="font-size:11px;font-weight:400;">(${bindings.length})</span></h3>
<table class="nanorc-table"><thead><tr><th>Key</th><th>Command</th><th>Context</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  host.innerHTML = parts.join('');
  return { parentNode: host };
}
