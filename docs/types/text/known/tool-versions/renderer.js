const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.toolversions-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tvr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0086C9;color:#fff;vertical-align:middle;margin-right:8px}
.tvr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tvr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 4px}
.tvr-note{font-size:11px;color:var(--fg-2,#888);margin:0 0 12px;padding:4px 8px;background:var(--bg-2,#f6f8fa);border-radius:6px;border-left:3px solid var(--border,#e0e0e0);display:inline-block}
.tvr-table{width:100%;border-collapse:collapse;font-size:13px}
.tvr-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:2px solid var(--border,#e0e0e0)}
.tvr-table td{padding:7px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tvr-table tr:last-child td{border-bottom:none}
.tvr-tool{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.tvr-ver{display:inline-block;font:11px/1.4 ui-monospace,monospace;padding:2px 7px;border-radius:8px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f)}
.tvr-ver-system{background:#f0f0f0;color:var(--fg-2,#888);border-color:#d0d0d0}
.tvr-ver-green{background:#e6f4ea;color:#1a6b2a;border-color:#a8d5b0}
`;

function versionClass(ver) {
  if (!ver || ver === 'system') return 'tvr-ver tvr-ver-system';
  // Heuristic: if major version looks recent (node 18+, python 3.10+, etc.), highlight green
  const m = ver.match(/^(\d+)\./);
  if (m) {
    const major = parseInt(m[1], 10);
    if (major >= 18) return 'tvr-ver tvr-ver-green';
  }
  // Also mark as green if version string looks like a recent year-style or high-minor
  const m2 = ver.match(/temurin-(\d+)/);
  if (m2 && parseInt(m2[1], 10) >= 17) return 'tvr-ver tvr-ver-green';
  return 'tvr-ver';
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const lines = text.split('\n');

  const tools = lines
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const parts = l.trim().split(/\s+/);
      return parts.length >= 2 ? { tool: parts[0], version: parts.slice(1).join(' ') } : null;
    })
    .filter(Boolean);

  const rows = tools.map((t) => {
    const cls = versionClass(t.version);
    return `<tr><td><span class="tvr-tool">${esc(t.tool)}</span></td><td><span class="${cls}">${esc(t.version)}</span></td></tr>`;
  }).join('');

  const tableHtml = tools.length
    ? `<table class="tvr-table"><thead><tr><th>Tool</th><th>Version</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No tool versions found</div>';

  const host = document.createElement('div');
  host.className = 'toolversions-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tvr-title"><span class="badge-tvr">asdf</span>.tool-versions</div>
<div class="tvr-sub">${tools.length} tool${tools.length !== 1 ? 's' : ''} pinned</div>
<div class="tvr-note">Sets local version overrides for this directory and its subdirectories</div>
${tableHtml}`;
  return { parentNode: host };
}
