const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gmod-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-gmod{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F05032;color:#fff;vertical-align:middle;margin-right:8px}
.gmod-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gmod-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.gmod-table{width:100%;border-collapse:collapse;font-size:13px}
.gmod-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.gmod-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.gmod-name{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.gmod-path{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.gmod-url{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all;max-width:360px;display:inline-block}
`;

function parseGitmodules(text) {
  const submodules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const sectionMatch = line.match(/^\[submodule\s+"(.+)"\]$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1], path: '', url: '' };
      submodules.push(current);
      continue;
    }
    if (current) {
      const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase();
        const val = kvMatch[2].trim();
        if (key === 'path') current.path = val;
        else if (key === 'url') current.url = val;
      }
    }
  }
  return submodules;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const submodules = parseGitmodules(text);

  const truncUrl = (u) => u.length > 60 ? u.slice(0, 57) + '…' : u;

  const rows = submodules
    .map((s) => `<tr>
      <td><span class="gmod-name">${esc(s.name)}</span></td>
      <td><span class="gmod-path">${esc(s.path)}</span></td>
      <td><span class="gmod-url">${esc(truncUrl(s.url))}</span></td>
    </tr>`)
    .join('');

  const tableHtml = submodules.length
    ? `<table class="gmod-table"><thead><tr><th>Name</th><th>Path</th><th>URL</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No submodules found</div>';

  const host = document.createElement('div');
  host.className = 'gmod-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gmod-title"><span class="badge-gmod">git</span>.gitmodules</div>
<div class="gmod-sub">${submodules.length} submodule${submodules.length !== 1 ? 's' : ''}</div>
${tableHtml}`;
  return { parentNode: host };
}
