import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ptc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-ptc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7C3AED;color:#fff;vertical-align:middle;margin-right:8px}
.ptc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.ptc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.ptc-sec{margin:12px 0}
.ptc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.ptc-table{width:100%;border-collapse:collapse;font-size:13px}
.ptc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.ptc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.ptc-tool{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.ptc-ver{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.ptc-proto-row{display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:0 0 12px;font-size:13px}
.ptc-proto-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600}
.ptc-proto-ver{font:13px/1.4 ui-monospace,monospace;font-weight:700;color:#7C3AED}
.ptc-pills{display:flex;flex-wrap:wrap;gap:6px}
.ptc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const data = parseTOML(text);

  // Separate top-level string entries (tool versions) from the settings table
  const protoVersion = typeof data.proto === 'string' ? data.proto : null;

  const tools = Object.entries(data)
    .filter(([key, val]) => key !== 'proto' && key !== 'settings' && typeof val === 'string')
    .map(([name, version]) => ({ name, version }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const settings = data.settings && typeof data.settings === 'object' ? data.settings : null;

  // proto CLI version row
  const protoHtml = protoVersion
    ? `<div class="ptc-proto-row"><span class="ptc-proto-label">proto CLI</span><span class="ptc-proto-ver">${esc(protoVersion)}</span></div>`
    : '';

  // Tools table
  const toolsHtml = tools.length
    ? `<div class="ptc-sec"><h3>Tools (${tools.length})</h3><table class="ptc-table"><thead><tr><th>Tool</th><th>Version</th></tr></thead><tbody>${tools.map((t) => `<tr><td><span class="ptc-tool">${esc(t.name)}</span></td><td><span class="ptc-ver">${esc(t.version)}</span></td></tr>`).join('')}</tbody></table></div>`
    : '';

  // Settings chips
  const settingsHtml = settings
    ? `<div class="ptc-sec"><h3>Settings</h3><div class="ptc-pills">${Object.entries(settings).map(([k, v]) => `<span class="ptc-pill">${esc(k)}: ${esc(v)}</span>`).join('')}</div></div>`
    : '';

  const toolCount = tools.length;
  const sub = `${toolCount} tool${toolCount !== 1 ? 's' : ''} pinned`;

  const host = document.createElement('div');
  host.className = 'ptc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ptc-title"><span class="badge-ptc">proto</span>.prototools</div>
<div class="ptc-sub">${esc(sub)}</div>
${protoHtml}${toolsHtml}${settingsHtml}`;
  return { parentNode: host };
}
