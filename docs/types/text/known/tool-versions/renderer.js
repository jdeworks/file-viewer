const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tvr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tvr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d97706;color:#fff;vertical-align:middle;margin-right:8px}
.tvr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tvr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.tvr-table{width:100%;border-collapse:collapse;font-size:13px}
.tvr-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tvr-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tvr-tool{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.tvr-ver{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  const tools = lines
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const parts = l.trim().split(/\s+/);
      return parts.length >= 2 ? { tool: parts[0], version: parts.slice(1).join(' ') } : null;
    })
    .filter(Boolean);

  const rows = tools.map((t) => `<tr><td><span class="tvr-tool">${esc(t.tool)}</span></td><td><span class="tvr-ver">${esc(t.version)}</span></td></tr>`).join('');

  const tableHtml = tools.length
    ? `<table class="tvr-table"><thead><tr><th>Tool</th><th>Version</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No tool versions found</div>';

  const host = document.createElement('div');
  host.className = 'tvr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tvr-title"><span class="badge-tvr">asdf</span>.tool-versions</div>
<div class="tvr-sub">${tools.length} tool${tools.length !== 1 ? 's' : ''} pinned</div>
${tableHtml}`;
  return { parentNode: host };
}
