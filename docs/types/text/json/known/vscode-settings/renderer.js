const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vsc-settings-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vsc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#007acc;color:#fff;vertical-align:middle;margin-right:8px;}
.vsc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vsc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.vsc-sec{margin:12px 0;}
.vsc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vsc-table{width:100%;border-collapse:collapse;font-size:13px;}
.vsc-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.vsc-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.vsc-key{font:12px/1.4 ui-monospace,monospace;color:var(--accent,#0969da);}
.vsc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);}
.vsc-group{display:inline-block;font-size:11px;padding:1px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 3px 2px 0;}
.vsc-lang{font-size:11px;padding:1px 8px;border-radius:4px;background:#ddf4ff;border:1px solid #54aeff;color:#0969da;font-family:ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid VS Code settings JSON.' }) }; }

  const langOverrides = Object.keys(cfg).filter((k) => k.startsWith('[') && k.endsWith(']'));
  const regularKeys = Object.keys(cfg).filter((k) => !k.startsWith('['));
  const totalCount = regularKeys.length + langOverrides.length;

  // Group by prefix (editor, typescript, eslint, files, etc.)
  const groups = {};
  for (const k of regularKeys) {
    const prefix = k.includes('.') ? k.split('.')[0] : 'other';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(k);
  }

  // Key settings to highlight
  const highlights = [
    'editor.fontSize', 'editor.tabSize', 'editor.formatOnSave', 'editor.defaultFormatter',
    'editor.wordWrap', 'editor.rulers', 'files.autoSave', 'typescript.preferences.importModuleSpecifier',
  ].filter((k) => cfg[k] !== undefined);

  const host = document.createElement('div');
  host.className = 'vsc-settings-doc';

  const highlightRows = highlights.map((k) => {
    const v = cfg[k];
    const display = typeof v === 'boolean' ? (v ? 'true' : 'false') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `<tr><td><span class="vsc-key">${esc(k)}</span></td><td><span class="vsc-val">${esc(display)}</span></td></tr>`;
  }).join('');

  const groupChips = Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([g, keys]) => `<span class="vsc-group">${esc(g)} <span style="color:var(--fg-2,#888)">(${keys.length})</span></span>`)
    .join('');

  const langChips = langOverrides.map((l) => `<span class="vsc-lang">${esc(l)}</span>`).join(' ');

  host.innerHTML = `<style>${CSS}</style>
<div class="vsc-title"><span class="badge-vsc">VS Code</span>Workspace settings</div>
<div class="vsc-sub">${totalCount} setting${totalCount !== 1 ? 's' : ''}${langOverrides.length ? ` · ${langOverrides.length} language override${langOverrides.length !== 1 ? 's' : ''}` : ''}</div>
${highlights.length ? `<div class="vsc-sec"><h3>Key settings</h3><table class="vsc-table"><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>${highlightRows}</tbody></table></div>` : ''}
${groupChips ? `<div class="vsc-sec"><h3>Setting groups (${Object.keys(groups).length})</h3><div style="margin:4px 0">${groupChips}</div></div>` : ''}
${langChips ? `<div class="vsc-sec"><h3>Language overrides</h3><div style="margin:4px 0">${langChips}</div></div>` : ''}
${!totalCount ? '<div style="color:var(--fg-2,#888);font-size:13px">No settings found.</div>' : ''}`;

  return { parentNode: host };
}
