const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lfrc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-lfrc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a472a;color:#fff;vertical-align:middle;margin-right:8px}
.lfrc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.lfrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.lfrc-sec{margin:14px 0}
.lfrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.lfrc-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0}
.lfrc-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:140px;flex-shrink:0}
.lfrc-kv-v{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all}
.lfrc-chip{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;font-family:ui-monospace,monospace;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa)}
.lfrc-chip-on{background:#dcfce7;border-color:#86efac;color:#166534}
.lfrc-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.lfrc-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#666)}
.lfrc-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.lfrc-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.lfrc-table{width:100%;border-collapse:collapse;font-size:13px}
.lfrc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.lfrc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px}
.lfrc-key{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.lfrc-cmd{font-family:ui-monospace,monospace;color:var(--fg-2,#555);word-break:break-all}
`;

function boolChip(val) {
  const s = String(val).toLowerCase();
  if (s === 'true') return '<span class="lfrc-chip lfrc-chip-on">yes</span>';
  if (s === 'false') return '<span class="lfrc-chip lfrc-chip-off">no</span>';
  return `<span class="lfrc-chip lfrc-chip-gray">${esc(val)}</span>`;
}

function kvRow(label, valueHtml) {
  if (!valueHtml) return '';
  return `<div class="lfrc-kv"><span class="lfrc-kv-k">${esc(label)}</span><span class="lfrc-kv-v">${valueHtml}</span></div>`;
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const lines = text.split('\n');

  const settings = {};
  const mappings = [];
  const cmdNames = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    if (!line || line.startsWith('#')) continue;

    // set option value
    const setMatch = /^set\s+(\S+)\s+(.+)$/.exec(line);
    if (setMatch) {
      settings[setMatch[1]] = setMatch[2].trim().replace(/^["']|["']$/g, '');
      continue;
    }
    // set option (boolean toggle, no value = true)
    const setBoolMatch = /^set\s+(\S+)$/.exec(line);
    if (setBoolMatch) {
      settings[setBoolMatch[1]] = 'true';
      continue;
    }

    // map key cmd
    const mapMatch = /^map\s+(\S+)\s+(.*)$/.exec(line);
    if (mapMatch) {
      mappings.push({ key: mapMatch[1], cmd: mapMatch[2].trim() });
      continue;
    }

    // cmd name block (may be multiline)
    const cmdMatch = /^cmd\s+(\S+)/.exec(line);
    if (cmdMatch) {
      cmdNames.push(cmdMatch[1]);
      // skip until block closes (balanced braces/dollar blocks)
      if (line.includes('${{') || line.includes('%{{') || line.includes('&{{')) {
        while (i < lines.length) {
          const nextLine = lines[i];
          i++;
          if (/^}}/.test(nextLine.trim())) break;
        }
      }
      continue;
    }
  }

  // Settings card
  function settingChip(key, trueColor = false) {
    const v = settings[key];
    if (v == null) return '';
    const lower = v.toLowerCase();
    if (lower === 'true' || lower === 'false') return boolChip(lower);
    if (trueColor) return `<span class="lfrc-chip lfrc-chip-on">${esc(v)}</span>`;
    return `<span class="lfrc-chip lfrc-chip-gray">${esc(v)}</span>`;
  }

  const infoValues = settings.info ? settings.info.split(':') : [];

  const settingsRows = [
    settings.icons != null ? kvRow('icons', boolChip(settings.icons)) : '',
    settings.preview != null ? kvRow('preview', boolChip(settings.preview)) : '',
    settings.hidden != null ? kvRow('hidden', boolChip(settings.hidden)) : '',
    settings.drawbox != null ? kvRow('drawbox', boolChip(settings.drawbox)) : '',
    settings.ignorecase != null ? kvRow('ignorecase', boolChip(settings.ignorecase)) : '',
    settings.previewer != null ? kvRow('previewer', `<span class="lfrc-kv-v">${esc(settings.previewer)}</span>`) : '',
    settings.cleaner != null ? kvRow('cleaner', `<span class="lfrc-kv-v">${esc(settings.cleaner)}</span>`) : '',
    settings.tabstop != null ? kvRow('tabstop', `<span class="lfrc-kv-v">${esc(settings.tabstop)}</span>`) : '',
    settings.scrolloff != null ? kvRow('scrolloff', `<span class="lfrc-kv-v">${esc(settings.scrolloff)}</span>`) : '',
    settings.ratios != null ? kvRow('ratios', `<span class="lfrc-kv-v">${esc(settings.ratios)}</span>`) : '',
    settings.sortby != null ? kvRow('sortby', `<span class="lfrc-chip lfrc-chip-gray">${esc(settings.sortby)}</span>`) : '',
    infoValues.length ? kvRow('info', infoValues.map((v) => `<span class="lfrc-chip lfrc-chip-gray">${esc(v)}</span>`).join(' ')) : '',
    settings.shell != null ? kvRow('shell', `<span class="lfrc-kv-v">${esc(settings.shell)}</span>`) : '',
    settings.shellopts != null ? kvRow('shellopts', `<span class="lfrc-kv-v">${esc(settings.shellopts)}</span>`) : '',
    settings.filesep != null ? kvRow('filesep', `<span class="lfrc-kv-v">${esc(settings.filesep)}</span>`) : '',
  ].filter(Boolean).join('');

  const settingsHtml = settingsRows ? `<div class="lfrc-sec"><h3>Settings</h3>${settingsRows}</div>` : '';

  // Key mappings table (first 10)
  const shownMappings = mappings.slice(0, 10);
  const mapRows = shownMappings.map((m) =>
    `<tr><td><span class="lfrc-key">${esc(m.key)}</span></td><td><span class="lfrc-cmd">${esc(m.cmd.length > 60 ? m.cmd.slice(0, 60) + '…' : m.cmd)}</span></td></tr>`
  ).join('');
  const mapCountLabel = mappings.length > 10 ? `Key Mappings (10 of ${mappings.length})` : `Key Mappings (${mappings.length})`;
  const mapHtml = mappings.length
    ? `<div class="lfrc-sec"><h3>${mapCountLabel}</h3><table class="lfrc-table"><thead><tr><th>Key</th><th>Command</th></tr></thead><tbody>${mapRows}</tbody></table></div>`
    : '';

  // Custom commands
  const cmdsHtml = cmdNames.length
    ? `<div class="lfrc-sec"><h3>Custom Commands (${cmdNames.length})</h3><div class="lfrc-pills">${cmdNames.map((n) => `<span class="lfrc-pill">${esc(n)}</span>`).join('')}</div></div>`
    : '';

  const parts = [];
  const settingCount = Object.keys(settings).length;
  if (settingCount) parts.push(`${settingCount} setting${settingCount !== 1 ? 's' : ''}`);
  if (mappings.length) parts.push(`${mappings.length} key binding${mappings.length !== 1 ? 's' : ''}`);
  if (cmdNames.length) parts.push(`${cmdNames.length} custom command${cmdNames.length !== 1 ? 's' : ''}`);
  const sub = parts.length ? parts.join(' · ') : 'lf terminal file manager configuration';

  const host = document.createElement('div');
  host.className = 'lfrc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="lfrc-title"><span class="badge-lfrc">lf</span>lf File Manager</div>
<div class="lfrc-sub">${esc(sub)}</div>
${settingsHtml}${mapHtml}${cmdsHtml}`;

  return { parentNode: host };
}
